/**
 * 分流規則與生涯報告驗證的測試：npm test
 * 合成剖面：每個小項指定一個目標分數，題目分數在目標附近交錯（避免被當成一直線作答）。
 */
import assert from "node:assert/strict";
import { ITEMS, scoreCddq, type SubscaleKey } from "../src/lib/cddq";
import { diagnose } from "../src/lib/diagnosis";
import { validatePlan, type ValidateContext } from "../src/lib/agent/validate";
import type { Route, Timing } from "../src/lib/agent/types";

type Profile = Partial<Record<SubscaleKey, number>> & { base: number };

function items(p: Profile, jitter = true) {
  const out: Record<string, number> = {};
  ITEMS.forEach((it, i) => {
    if ("validity" in it) return;
    const target = p[it.subscale] ?? p.base;
    const d = jitter ? [0, 1, -1][i % 3] : 0;
    out[it.id] = Math.min(9, Math.max(1, Math.round(target + d)));
  });
  return out;
}
const slow: Timing = { started_at: "2026-11-18T10:00:00Z", submitted_at: "2026-11-18T10:12:00Z" };
const fast: Timing = { started_at: "2026-11-18T10:00:00Z", submitted_at: "2026-11-18T10:00:30Z" };

const cases: { name: string; p: Profile; timing?: Timing; jitter?: boolean; route: Route }[] = [
  // self_help：只有資訊類突出、總分不高
  { name: "只缺職業資訊", p: { base: 3, occupations: 7, ways: 6 }, route: "self_help" },
  { name: "只缺自我了解", p: { base: 3, self: 6, process: 5.5 }, route: "self_help" },
  { name: "不可靠資訊視同資訊類", p: { base: 3, unreliable: 6, occupations: 6 }, route: "self_help" },
  { name: "只有動機偏高：不轉諮商", p: { base: 3, motivation: 8 }, route: "self_help" },
  // counseling：A2/A3/C2/C3 任一為高，或總分高
  { name: "外在衝突高", p: { base: 3, external: 8 }, route: "counseling" },
  { name: "猶豫不決高", p: { base: 4, indecisiveness: 8, occupations: 6 }, route: "counseling" },
  { name: "內在衝突高", p: { base: 3, internal: 7.5 }, route: "counseling" },
  { name: "總分高", p: { base: 7, occupations: 8 }, route: "counseling" },
  // guided：突出項橫跨兩大類
  { name: "資訊＋內在衝突中等", p: { base: 2.5, occupations: 6, internal: 6 }, route: "guided" },
  { name: "資訊＋信念中等", p: { base: 2.5, self: 6, beliefs: 6 }, route: "guided" },
  { name: "只有猶豫中等", p: { base: 2.5, indecisiveness: 6 }, route: "guided" },
  // clarify_first：一直線作答＋平坦
  { name: "一直線作答", p: { base: 5 }, jitter: false, route: "clarify_first" },
  { name: "作答過快且平坦", p: { base: 4 }, timing: fast, route: "clarify_first" },
];

let pass = 0;
for (const c of cases) {
  const it = items(c.p, c.jitter ?? true);
  const d = diagnose(it, scoreCddq(it), c.timing ?? slow);
  assert.equal(d.route, c.route, `${c.name}：預期 ${c.route}，得到 ${d.route}（salient ${d.salient}, conf ${d.confidence}, diff ${d.differentiation}）`);
  pass++;
}

// 單一條件不通過 → 信心中等，仍給生涯報告
{
  const it = items({ base: 3, occupations: 7 });
  const d = diagnose(it, scoreCddq(it), fast);
  assert.equal(d.confidence, "medium");
  assert.ok(d.credibility.reasons.includes("too_fast"));
  pass++;
}

// ─── 驗證：造假的輸出要被擋下 ─────────────────────────
const ctx: ValidateContext = {
  diagnosis: { salient: ["occupations", "external"], route: "guided" },
  activeResourceIds: new Set(["lb-coffee", "ucan"]),
  stories: new Map([["a1", { q5: "大四那年我很迷惘，後來是一杯咖啡改變了我。", q6: "不要怕走彎路。" }]]),
  personNames: ["王小明", "陳系友"],
  seenUrls: new Set(["https://career.ntu.edu.tw/student/events"]),
};
const good = {
  overview: "你對未來的工作樣子還不太清楚，也在意家人的想法。下面整理了兩個方向。",
  focuses: [
    {
      subscale: "occupations",
      title: "看見工作的樣子",
      why: "你在對職業的了解這一項分數比較高，代表還不清楚工作每天實際在做什麼。",
      alumni_quote: { alumni_id: "a1", question: "q5", quote: "大四那年我很迷惘，後來是一杯咖啡改變了我。" },
      resource_ids: ["lb-coffee"],
      links: [{ title: "職涯中心本學期活動", url: "https://career.ntu.edu.tw/student/events", note: "看看這學期有哪些產業講座。" }],
      action: "這週寫一封線上提問給系友。",
      writing_prompt: "寫下三個你最想問的問題。",
      components: ["world_of_work_info", "support_network", "writing_exercise"],
    },
  ],
  tags: [{ tag: "value:助人", weight: 0.5 }],
};
assert.equal(validatePlan(good, ctx).ok, true, "正常的生涯報告應該通過");
pass++;

const bad = (patch: (p: typeof good) => void) => {
  const p = structuredClone(good);
  patch(p);
  return validatePlan(p, ctx);
};
const rejects: [string, (p: typeof good) => void][] = [
  ["假資源", (p) => (p.focuses[0].resource_ids = ["fake-resource"])],
  ["假系友", (p) => (p.focuses[0].alumni_quote = { alumni_id: "nobody", question: "q5", quote: "大四那年我很迷惘" })],
  ["不是原文的引言", (p) => (p.focuses[0].alumni_quote!.quote = "大四那年我很快樂，一切都很順利。")],
  ["焦點不在突出項", (p) => (p.focuses[0].subscale = "motivation")],
  ["成分不足 3 種", (p) => (p.focuses[0].components = ["world_of_work_info", "support_network"])],
  ["沒有找人的出口", (p) => (p.focuses[0].components = ["world_of_work_info", "writing_exercise", "modeling"])],
  ["出現人名", (p) => (p.overview += "可以找王小明聊聊。")],
  ["醫療化字詞", (p) => (p.focuses[0].why += "這不是一種障礙。")],
  ["編造的網址（沒出現在搜尋結果）", (p) => (p.focuses[0].links[0].url = "https://career.ntu.edu.tw/made-up")],
  ["非官方網域", (p) => (p.focuses[0].links[0].url = "https://example.com/jobs")],
  ["格式錯誤", (p) => ((p as { overview: unknown }).overview = 3)],
];
for (const [name, patch] of rejects) {
  assert.equal(bad(patch).ok, false, `應該擋下：${name}`);
  pass++;
}

console.log(`✔ ${pass} 項測試通過`);
