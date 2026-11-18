/**
 * 處置包驗證（計畫書 §2.6）。純函式：所有資料由呼叫端準備好傳進來，方便測試。
 */
import { AgentPlanSchema, type AgentPlan, type Diagnosis } from "./types";

export type ValidateContext = {
  diagnosis: Pick<Diagnosis, "salient" | "route">;
  /** 啟用中的資源 id */
  activeResourceIds: Set<string>;
  /** 符合資格的系友：id → 各題原文 */
  stories: Map<string, Record<string, string | undefined>>;
  /** 網站上所有人的姓名（用來抓捏造或洩漏的人名） */
  personNames: string[];
  /** 這次網路搜尋／讀取結果裡出現過的網址 */
  seenUrls?: Set<string>;
};

/** 可以放進處置包的網域：臺大各單位、政府機關、教育部 */
export const LINK_DOMAINS = ["ntu.edu.tw", "gov.tw", "edu.tw"];
export const isCampus = (url: string) => {
  try {
    return /(^|\.)ntu\.edu\.tw$/.test(new URL(url).hostname);
  } catch {
    return false;
  }
};
const allowedHost = (url: string) => {
  try {
    const h = new URL(url).hostname;
    return LINK_DOMAINS.some((d) => h === d || h.endsWith("." + d));
  } catch {
    return false;
  }
};
const normUrl = (u: string) => u.replace(/#.*$/, "").replace(/\/$/, "");

export const BANNED_WORDS = ["診斷", "疾病", "病症", "障礙", "異常", "症狀", "精神病", "治療"];

const norm = (s: string) => s.replace(/[\s　]+/g, "");

export function validatePlan(raw: unknown, ctx: ValidateContext): { ok: true; plan: AgentPlan } | { ok: false; errors: string[] } {
  const parsed = AgentPlanSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, errors: parsed.error.issues.slice(0, 8).map((i) => `格式：${i.path.join(".")} ${i.message}`) };
  }
  const plan = parsed.data;
  const errors: string[] = [];

  // 2. 焦點必須是突出項
  if (ctx.diagnosis.route !== "clarify_first") {
    for (const f of plan.focuses) {
      if (!ctx.diagnosis.salient.includes(f.subscale)) errors.push(`焦點 ${f.subscale} 不在突出項 ${ctx.diagnosis.salient.join(",")} 裡`);
    }
  }
  const seenFocus = new Set<string>();
  for (const f of plan.focuses) {
    if (seenFocus.has(f.subscale)) errors.push(`焦點 ${f.subscale} 重複`);
    seenFocus.add(f.subscale);
  }

  // 3. 資源必須存在且啟用
  for (const f of plan.focuses) {
    for (const id of f.resource_ids) if (!ctx.activeResourceIds.has(id)) errors.push(`資源 ${id} 不存在或已停用`);
  }

  // 3b. 網路資訊：網址必須是官方網域，且真的出現在這次的搜尋結果裡（不能自己編網址）
  const seen = new Set([...(ctx.seenUrls ?? [])].map(normUrl));
  for (const f of plan.focuses) {
    for (const l of f.links) {
      if (!allowedHost(l.url)) errors.push(`網址 ${l.url} 不是臺大或政府網站`);
      else if (!seen.has(normUrl(l.url))) errors.push(`網址 ${l.url} 沒有出現在搜尋結果裡`);
    }
  }

  // 4. 系友引言必須是原文子字串，且系友仍符合資格
  for (const f of plan.focuses) {
    const q = f.alumni_quote;
    if (!q) continue;
    const story = ctx.stories.get(q.alumni_id);
    if (!story) {
      errors.push(`系友 ${q.alumni_id} 不存在或目前不能被引用`);
      continue;
    }
    const source = story[q.question];
    if (!source || !norm(source).includes(norm(q.quote))) errors.push(`「${q.quote.slice(0, 20)}…」不是系友 ${q.alumni_id} 第 ${q.question} 題的原文`);
  }

  // 5. 有效成分 ≥ 3 種，且至少一個焦點有人的支持
  const comps = new Set(plan.focuses.flatMap((f) => f.components));
  if (comps.size < 3) errors.push(`有效成分只有 ${comps.size} 種，至少要 3 種`);
  if (!plan.focuses.some((f) => f.components.includes("counselor_support") || f.components.includes("support_network"))) {
    errors.push("至少一個焦點要包含 counselor_support 或 support_network（找一個人）");
  }

  // 6、7. 文字檢查：不出現人名、不出現醫療化字詞（引言本身除外，引言已驗證是原文）
  const texts = [plan.overview, ...plan.focuses.flatMap((f) => [f.title, f.why, f.action, f.writing_prompt, ...f.links.map((l) => l.note)])];
  const all = texts.join("\n");
  for (const name of ctx.personNames) {
    if (name.length >= 2 && all.includes(name)) errors.push(`文字裡出現了人名「${name}」`);
  }
  for (const w of BANNED_WORDS) if (all.includes(w)) errors.push(`文字裡出現了「${w}」`);

  return errors.length ? { ok: false, errors } : { ok: true, plan };
}
