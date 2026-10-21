/** 不依賴 Next 的標籤規則（種子資料與伺服器共用） */
import { TAG_VOCAB, type TagDimension } from "./tags";
import { levelOf, SUBSCALES, type CddqAnswers, type CddqScores, type SubscaleKey } from "./cddq";

export type Tag = { dimension: TagDimension; label: string; weight: number };

/** 關鍵字 → 標籤。AI 無法使用時的備案，也用來從職稱產生基本標籤。 */
const KEYWORDS: [RegExp, TagDimension, string][] = [
  [/臨床|諮商|心理師|心理治療|心理諮詢/, "field", "臨床與諮商心理"],
  [/教授|博士|博士後|論文|實驗室|研究員|學術/, "field", "學術研究"],
  [/神經|腦科學|fMRI|腦造影|生醫|認知神經/i, "field", "神經科學與生醫"],
  [/UX|使用者|用戶研究|產品經理|PM\b|介面|互動設計/i, "field", "使用者經驗與產品"],
  [/資料科學|數據|AI|機器學習|演算法|工程師|程式/i, "field", "資料科學與 AI"],
  [/人資|HR|招募|組織發展|人才發展|員工/i, "field", "人資與組織發展"],
  [/行銷|品牌|廣告|公關|傳播|媒體/, "field", "行銷、品牌與傳播"],
  [/顧問|管理顧問|策略|商業|營運/, "field", "商業管理與顧問"],
  [/教師|老師|教育|學校|教學/, "field", "教育"],
  [/醫院|公衛|公共衛生|醫療|健康/, "field", "醫療與公共衛生"],
  [/政府|公務|NGO|非營利|基金會|社福|社工/i, "field", "公共服務與非營利"],
  [/創業|新創|創辦/, "field", "創業"],

  [/研究|調查|訪談|問卷/, "function", "研究與調查"],
  [/諮商|輔導|陪伴|助人|個案/, "function", "諮商與助人"],
  [/分析|數據|統計|資料/, "function", "資料分析"],
  [/產品|設計|原型/, "function", "產品與設計"],
  [/專案|跨部門|PM\b/i, "function", "專案管理"],
  [/教學|培訓|講師|課程設計/, "function", "教學與培訓"],
  [/寫作|編輯|內容|文案|出版/, "function", "寫作與內容"],
  [/業務|BD|銷售|商務開發/i, "function", "業務與商務開發"],
  [/招募|人才|獵頭/, "function", "招募與人才發展"],
  [/顧問|策略/, "function", "策略與顧問"],

  [/研究所|碩士|博士班|讀研/, "experience", "讀研究所"],
  [/出國|留學|美國|英國|德國|日本|海外|國外/, "experience", "出國留學"],
  [/轉職|轉換跑道|轉行|換跑道|離開學界|轉換/, "experience", "轉換跑道"],
  [/創業|新創|創辦/, "experience", "創業"],
  [/國考|證照|執照|高考/, "experience", "國家考試與證照"],
  [/跨領域|雙主修|輔系|跨域/, "experience", "跨領域學習"],
  [/延畢|休學/, "experience", "延畢或休學"],
  [/gap year|空檔年|休息一年/i, "experience", "Gap Year"],
  [/進入業界|離開學術|業界/, "experience", "從學界到業界"],
  [/回到學校|回學界|重返校園/, "experience", "從業界回學界"],
  [/公部門|公務員|政府機關/, "experience", "公部門工作"],
  [/外商|國際|跨國|全球/, "experience", "外商或國際工作"],

  [/助人|陪伴|幫助別人/, "value", "助人"],
  [/穩定|安穩/, "value", "穩定"],
  [/創意|創造|創作/, "value", "創造力"],
  [/自由|自主|自己作主/, "value", "自主"],
  [/影響力|改變社會|社會議題|社會/, "value", "社會影響力"],
  [/好奇/, "value", "好奇心"],
  [/平衡|生活品質|工作與生活/, "value", "生活平衡"],
  [/家人|父母|爸媽|家裡的期待/, "value", "面對家人期待"],
  [/迷惘|不確定|焦慮|徬徨/, "value", "在不確定中前進"],
  [/探索|認識自己|了解自己/, "value", "自我探索"],
];

export function keywordTags(text: string, base = 0.4): Tag[] {
  const out: Tag[] = [];
  for (const [re, dimension, label] of KEYWORDS) {
    const hits = text.match(new RegExp(re.source, re.flags.includes("g") ? re.flags : re.flags + "g"))?.length ?? 0;
    if (hits) out.push({ dimension, label, weight: Math.min(1, base + 0.15 * (hits - 1)) });
  }
  return out;
}

/** 沒寫故事的系友：從領域與職稱產生基本標籤 */
export function profileTags(p: { title: string | null; field_category: string[] }): Tag[] {
  const tags: Tag[] = p.field_category
    .filter((f) => TAG_VOCAB.field.includes(f))
    .map((f) => ({ dimension: "field" as const, label: f, weight: 1 }));
  if (p.title) tags.push(...keywordTags(p.title, 0.6));
  return tags;
}

// ─── 學生標籤 ──────────────────────────────────────────

const STAGE_TAGS: Record<CddqAnswers["stage"], Tag[]> = {
  early: [{ dimension: "value", label: "自我探索", weight: 0.6 }],
  senior: [
    { dimension: "experience", label: "讀研究所", weight: 0.4 },
    { dimension: "experience", label: "從學界到業界", weight: 0.4 },
  ],
  grad: [
    { dimension: "experience", label: "從學界到業界", weight: 0.5 },
    { dimension: "experience", label: "出國留學", weight: 0.3 },
  ],
  new_grad: [
    { dimension: "experience", label: "從學界到業界", weight: 0.6 },
    { dimension: "value", label: "在不確定中前進", weight: 0.4 },
  ],
  working: [{ dimension: "experience", label: "轉換跑道", weight: 0.7 }],
};

const GOAL_TAGS: Record<CddqAnswers["goal"], Tag[]> = {
  direction: [
    { dimension: "value", label: "自我探索", weight: 1 },
    { dimension: "value", label: "在不確定中前進", weight: 0.7 },
  ],
  occupation: [{ dimension: "experience", label: "跨領域學習", weight: 0.4 }],
  grad_school: [
    { dimension: "experience", label: "讀研究所", weight: 1 },
    { dimension: "experience", label: "出國留學", weight: 0.7 },
  ],
  job_search: [
    { dimension: "experience", label: "從學界到業界", weight: 0.8 },
    { dimension: "function", label: "招募與人才發展", weight: 0.4 },
  ],
  switch: [
    { dimension: "experience", label: "轉換跑道", weight: 1 },
    { dimension: "experience", label: "跨領域學習", weight: 0.6 },
  ],
  family: [{ dimension: "value", label: "面對家人期待", weight: 1 }],
  exam: [{ dimension: "experience", label: "國家考試與證照", weight: 1 }],
  startup: [
    { dimension: "experience", label: "創業", weight: 1 },
    { dimension: "value", label: "自主", weight: 0.6 },
  ],
};

const SUBSCALE_TAGS: Partial<Record<SubscaleKey, Omit<Tag, "weight">[]>> = {
  motivation: [{ dimension: "value", label: "自我探索" }],
  indecisiveness: [{ dimension: "value", label: "在不確定中前進" }],
  beliefs: [{ dimension: "experience", label: "轉換跑道" }],
  self: [{ dimension: "value", label: "自我探索" }],
  internal: [{ dimension: "experience", label: "跨領域學習" }],
  external: [{ dimension: "value", label: "面對家人期待" }],
};

export function cddqTags(a: CddqAnswers, s: CddqScores): Tag[] {
  const tags: Tag[] = a.interests
    .filter((f) => TAG_VOCAB.field.includes(f))
    .map((f) => ({ dimension: "field" as const, label: f, weight: 1 }));
  tags.push(...(STAGE_TAGS[a.stage] ?? []), ...(GOAL_TAGS[a.goal] ?? []));
  for (const key of Object.keys(SUBSCALES) as SubscaleKey[]) {
    const score = s.subscales[key];
    if (levelOf(score) === "low") continue;
    for (const t of SUBSCALE_TAGS[key] ?? []) tags.push({ ...t, weight: (score - 1) / 8 });
  }
  return tags;
}
