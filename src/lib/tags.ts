/**
 * 推薦系統的固定標籤詞彙表（系友與學生共用）
 * 學生的「想要什麼」和系友的「走過什麼」落在同一組標籤上，才能互相比對。
 */
import { FIELD_CATEGORIES } from "./constants";

export type TagDimension = "field" | "function" | "experience" | "value";

export const TAG_DIMENSION_LABEL: Record<TagDimension, string> = {
  field: "領域",
  function: "職能",
  experience: "經歷類型",
  value: "價值與特質",
};

export const TAG_VOCAB: Record<TagDimension, readonly string[]> = {
  field: FIELD_CATEGORIES.filter((f) => f !== "其他"),
  function: [
    "研究與調查",
    "諮商與助人",
    "資料分析",
    "產品與設計",
    "專案管理",
    "教學與培訓",
    "寫作與內容",
    "業務與商務開發",
    "招募與人才發展",
    "策略與顧問",
  ],
  experience: [
    "讀研究所",
    "出國留學",
    "轉換跑道",
    "創業",
    "國家考試與證照",
    "跨領域學習",
    "延畢或休學",
    "Gap Year",
    "從學界到業界",
    "從業界回學界",
    "公部門工作",
    "外商或國際工作",
  ],
  value: [
    "助人",
    "穩定",
    "創造力",
    "自主",
    "社會影響力",
    "好奇心",
    "生活平衡",
    "面對家人期待",
    "在不確定中前進",
    "自我探索",
  ],
};

export type TagKey = `${TagDimension}:${string}`;
export type TagVector = Map<TagKey, number>;

export const tagKey = (dimension: TagDimension, label: string) => `${dimension}:${label}` as TagKey;

export function isKnownTag(dimension: string, label: string): dimension is TagDimension {
  return dimension in TAG_VOCAB && TAG_VOCAB[dimension as TagDimension].includes(label);
}

/** 所有標籤的平面清單（給 AI 挑選用） */
export function allTags() {
  return (Object.keys(TAG_VOCAB) as TagDimension[]).flatMap((d) => TAG_VOCAB[d].map((label) => ({ dimension: d, label })));
}

export function cosine(a: TagVector, b: TagVector): number {
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (const [k, w] of a) {
    na += w * w;
    const v = b.get(k);
    if (v) dot += w * v;
  }
  for (const w of b.values()) nb += w * w;
  if (!na || !nb) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

/** 同一個標籤有多個來源時，取最大權重 */
export function mergeVector(rows: { dimension: string; label: string; weight: number }[]): TagVector {
  const v: TagVector = new Map();
  for (const r of rows) {
    const k = tagKey(r.dimension as TagDimension, r.label);
    v.set(k, Math.max(v.get(k) ?? 0, Number(r.weight)));
  }
  return v;
}
