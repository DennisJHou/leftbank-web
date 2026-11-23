/**
 * 四步驟差異診斷＋分流（純函式，沒有 I/O）
 * 依 Amir, Gati & Kleiman（2008）的判讀程序：可信度 → 區辨度 → 相對突出度 → 回饋信心
 * 規則與門檻見 diagnosis-config.ts；計畫書 §1.2–1.3
 */
import { ITEMS, SUBSCALE_ORDER, SUBSCALES, type CddqScores, type SubscaleKey } from "./cddq";
import { COUNSELING_SUBSCALES, DIAGNOSIS_VERSION, INFO_LIKE, THRESHOLDS } from "./diagnosis-config";
import type { Diagnosis, Route, Timing } from "./agent/types";

const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
const sd = (xs: number[]) => {
  const m = mean(xs);
  return Math.sqrt(mean(xs.map((x) => (x - m) ** 2)));
};
const r2 = (n: number) => Math.round(n * 100) / 100;

export type Level = "low" | "moderate" | "high";
export function level(score: number, t = THRESHOLDS): Level {
  if (score > t.high) return "high";
  if (score >= t.low) return "moderate";
  return "low";
}

/** 可信度：作答過快、一直線作答 */
export function credibility(items: Record<string, number>, timing: Timing | null | undefined, t = THRESHOLDS) {
  const values = ITEMS.filter((i) => !("validity" in i)).map((i) => items[i.id]).filter((v) => typeof v === "number");
  const reasons: Diagnosis["credibility"]["reasons"] = [];

  let msPerItem: number | null = null;
  if (timing?.per_item_ms && Object.keys(timing.per_item_ms).length >= values.length * 0.8) {
    msPerItem = mean(Object.values(timing.per_item_ms));
  } else if (timing?.started_at) {
    const ms = new Date(timing.submitted_at).getTime() - new Date(timing.started_at).getTime();
    if (Number.isFinite(ms) && ms > 0) msPerItem = ms / values.length;
  }
  if (msPerItem != null && msPerItem < t.fastMsPerItem) reasons.push("too_fast");

  const counts = new Map<number, number>();
  for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1);
  const maxShare = Math.max(...counts.values()) / values.length;
  const itemSd = sd(values);
  if (maxShare >= t.straightShare || itemSd < t.itemSd) reasons.push("straight_line");

  return { ok: reasons.length === 0, reasons, itemSd: r2(itemSd) };
}

/** 主要入口：分數＋作答＋時間 → 診斷與分流 */
export function diagnose(items: Record<string, number>, scores: CddqScores, timing?: Timing | null, t = THRESHOLDS): Diagnosis {
  const cred = credibility(items, timing, t);
  const subs = SUBSCALE_ORDER.map((k) => scores.subscales[k]);
  const m = mean(subs);
  const s = sd(subs);

  // 2. 區辨度：剖面平坦時，依總分分成全高或全低（中間值以上算全高）
  const differentiation: Diagnosis["differentiation"] =
    s >= t.flatSd ? "differentiated" : scores.total >= (t.high + t.low) / 2 ? "flat_high" : "flat_low";

  // 3. 相對突出度：高於個人平均 0.5 SD，且絕對程度至少「有些卡關」；最多 3 個
  const ranked = [...SUBSCALE_ORDER].sort((a, b) => scores.subscales[b] - scores.subscales[a]);
  let salient = ranked.filter((k) => scores.subscales[k] >= m + t.salientSd * s && level(scores.subscales[k], t) !== "low").slice(0, 3);
  // 平坦剖面沒有相對突出的項目：退而取絕對分數最高、至少中等的 2 項，讓生涯報告仍有焦點
  if (!salient.length) {
    salient = ranked.filter((k) => level(scores.subscales[k], t) !== "low").slice(0, 2);
    if (!salient.length) salient = ranked.slice(0, 1);
  }

  // 4. 回饋信心
  const fails = Number(!cred.ok) + Number(differentiation !== "differentiated");
  const confidence: Diagnosis["confidence"] = fails === 0 ? "high" : fails === 1 ? "medium" : "low";

  const route = triage({ confidence, salient, scores, t });

  return {
    version: DIAGNOSIS_VERSION,
    thresholds: { ...t },
    credibility: { ok: cred.ok, reasons: cred.reasons },
    differentiation,
    salient,
    confidence,
    route,
    stats: { mean: r2(m), sd: r2(s), itemSd: cred.itemSd },
  };
}

/** 分流：依序判斷，先符合者為準（計畫書 §1.3） */
export function triage({
  confidence,
  salient,
  scores,
  t = THRESHOLDS,
}: {
  confidence: Diagnosis["confidence"];
  salient: SubscaleKey[];
  scores: CddqScores;
  t?: typeof THRESHOLDS;
}): Route {
  if (confidence === "low") return "clarify_first";

  // 動機（A1）單獨偏高不觸發諮商：只看 A2、A3、C2、C3 與總分
  const counselingHigh = COUNSELING_SUBSCALES.some((k) => level(scores.subscales[k], t) === "high");
  if (counselingHigh || level(scores.total, t) === "high") return "counseling";

  // 台灣化：不可靠資訊（C1）視同資訊類
  const groupOf = (k: SubscaleKey) => (INFO_LIKE.includes(k) ? "information" : SUBSCALES[k].category);
  const groups = new Set(salient.map(groupOf));
  if (groups.size >= 2) return "guided";
  if (salient.every((k) => INFO_LIKE.includes(k))) return "self_help";
  // 只有準備度或衝突類中等偏高：有 A2、A3、C2、C3 的走有人陪，只有動機的走自助（用探問框架）
  return salient.some((k) => COUNSELING_SUBSCALES.includes(k)) ? "guided" : "self_help";
}
