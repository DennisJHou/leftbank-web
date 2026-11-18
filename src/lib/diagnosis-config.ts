/**
 * 診斷門檻與「小項 × 建議介入」對照
 *
 * ⚠️ 待查證：所有數值都還沒有從原始文獻（Amir, Gati & Kleiman 2008；Gati & Levin 2014）核對。
 *   - high / low 沿用程式原本的 6.33 / 3.67（研究筆記記得的是 6.67 / 3.33，兩組都未查證），見計畫書 §9-1
 *   - 其餘（作答速度、一直線、平坦、突出）是本計畫自訂的初版，封測後再調整
 * 每筆診斷都會把當時的門檻寫進紀錄（diagnosis.thresholds），日後改門檻仍可回溯。
 */
import type { SubscaleKey } from "./cddq";
import type { Component } from "./agent/types";

export const DIAGNOSIS_VERSION = "2026-11-v1";

export const THRESHOLDS = {
  /** 小項平均 > high 為「明顯卡關」（待查證） */
  high: 6.33,
  /** 小項平均 < low 為「穩定」（待查證） */
  low: 3.67,
  /** 10 個小項分數的標準差小於此值 → 剖面平坦（自訂） */
  flatSd: 0.8,
  /** 小項 ≥ 個人平均 + salientSd × SD 才算相對突出（自訂） */
  salientSd: 0.5,
  /** 平均每題作答時間低於此值（毫秒）→ 作答過快（自訂） */
  fastMsPerItem: 1500,
  /** ≥ 此比例的題目同一個分數 → 一直線作答（自訂） */
  straightShare: 0.8,
  /** 44 題的標準差小於此值 → 一直線作答（自訂） */
  itemSd: 0.6,
} as const;

export const THRESHOLD_NOTES: Record<keyof typeof THRESHOLDS, { label: string; source: string; verified: boolean }> = {
  high: { label: "明顯卡關門檻", source: "Gati 慣例（程式原值）；研究筆記記為 6.67", verified: false },
  low: { label: "穩定門檻", source: "Gati 慣例（程式原值）；研究筆記記為 3.33", verified: false },
  flatSd: { label: "剖面平坦（小項標準差）", source: "本計畫自訂", verified: false },
  salientSd: { label: "相對突出（平均 + n×SD）", source: "本計畫自訂，依 Amir et al. 2008 的概念", verified: false },
  fastMsPerItem: { label: "作答過快（每題毫秒）", source: "本計畫自訂", verified: false },
  straightShare: { label: "一直線作答（同分比例）", source: "本計畫自訂", verified: false },
  itemSd: { label: "一直線作答（44 題標準差）", source: "本計畫自訂", verified: false },
};

/** 偏高時建議走諮商路徑的小項（研究筆記：A2、A3、C2、C3） */
export const COUNSELING_SUBSCALES: SubscaleKey[] = ["indecisiveness", "beliefs", "internal", "external"];

/** 分流時視為「資訊類」的小項（台灣資料：C1 不可靠資訊歸入缺乏資訊，田 2001） */
export const INFO_LIKE: SubscaleKey[] = ["process", "self", "occupations", "ways", "unreliable"];

export type Evidence = "direct" | "inferred" | "preliminary";
export const EVIDENCE_LABEL: Record<Evidence, string> = { direct: "直", inferred: "推", preliminary: "初" };
export const EVIDENCE_TEXT: Record<Evidence, string> = {
  direct: "整合分析確認這個成分有效（但沒有依小項分開分析）",
  inferred: "由有效成分或理論推論",
  preliminary: "只有單一研究或前後測證據",
};

/** 研究筆記〈類別 × 介入對照〉的結構化版本。提供給 Agent，避免模型自己回憶文獻。 */
export const INTERVENTIONS: Record<
  SubscaleKey,
  { suggest: string; components: Component[]; evidence: Evidence; frame: string; note: string }
> = {
  motivation: {
    suggest: "決策心理教育、楷模示範、建立支持；先探問「不急著決定」背後的原因",
    components: ["decision_psychoeducation", "modeling", "support_network"],
    evidence: "inferred",
    frame: "用「探問」而不是「推動」：好奇他為什麼現在不想決定，不要催促。台灣資料中動機不與其他量表聚類，不要解讀為準備不足。",
    note: "成分【直】，對應【推】",
  },
  indecisiveness: {
    suggest: "個別諮商處理情緒與人格成分；把大決定拆成可以反悔的小實驗",
    components: ["counselor_support", "decision_psychoeducation"],
    evidence: "inferred",
    frame: "做決定本身吃力，與選項無關。建議低負擔、可反悔的小步驟，並鼓勵找心理師談談。",
    note: "【推】Saka, Gati & Kelly 2008；【初】個案研究",
  },
  beliefs: {
    suggest: "認知重建（CIP／CTI 取向）：辨識「只有一條對的路」「選錯就完了」等信念",
    components: ["decision_psychoeducation", "modeling", "counselor_support"],
    evidence: "preliminary",
    frame: "用系友轉彎的真實經歷鬆動「一次定終身」的想法，不要說教。",
    note: "【初】Reed et al. 2001",
  },
  process: {
    suggest: "決策心理教育（例如 PIC：預篩、深入探索、選擇）",
    components: ["decision_psychoeducation", "individualized_feedback"],
    evidence: "direct",
    frame: "給一個清楚、簡單的做決定步驟，讓他知道下一步是什麼。",
    note: "心理教育【直】",
  },
  self: {
    suggest: "興趣與性格測驗，加上個別化解釋；書寫練習；價值澄清",
    components: ["individualized_feedback", "writing_exercise", "values_clarification"],
    evidence: "direct",
    frame: "測驗之後一定要有人一起解讀；用書寫把模糊的感覺說清楚。",
    note: "個別化解釋、書寫練習【直】",
  },
  occupations: {
    suggest: "職業世界資訊、職場體驗、實習；直接問在那個位置上的人",
    components: ["world_of_work_info", "modeling"],
    evidence: "direct",
    frame: "最快的方法是問真的在做這份工作的人。",
    note: "職業世界資訊【直】；實習【推】",
  },
  ways: {
    suggest: "資訊搜尋技巧、示範、引介人脈",
    components: ["modeling", "support_network", "world_of_work_info"],
    evidence: "inferred",
    frame: "告訴他具體去哪裡找、找誰問，降低開口的門檻。",
    note: "示範【直】，對應【推】",
  },
  unreliable: {
    suggest: "在有人陪同下評估資訊；第一手接觸（台灣資料併入資訊類處理）",
    components: ["world_of_work_info", "support_network"],
    evidence: "inferred",
    frame: "找一兩位真的在該領域工作的人核對，勝過讀十篇文章。",
    note: "【推】田 2001",
  },
  internal: {
    suggest: "價值澄清、職業卡分類、妥協練習",
    components: ["values_clarification", "writing_exercise", "counselor_support"],
    evidence: "direct",
    frame: "把彼此拉扯的條件寫下來排序，看見「取捨之後」的樣子。",
    note: "價值澄清【直】（Whiston et al. 2017）",
  },
  external: {
    suggest: "建立支持、協助與家人溝通；家庭圖、生命線等敘事工具",
    components: ["support_network", "values_clarification", "counselor_support"],
    evidence: "inferred",
    frame: "把家人的期待放進決策條件一起考慮，而不是當成要切割的障礙。",
    note: "建立支持【直】；家庭介入沒有整合分析【初】",
  },
};

/** 每位使用者每 30 天最多幾次 Agent */
export const agentMaxPer30d = () => {
  const n = Number(process.env.AGENT_MAX_PER_USER_30D);
  return Number.isFinite(n) && n > 0 ? n : 3;
};
