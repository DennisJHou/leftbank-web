/**
 * 職涯羅盤（基礎版）：生涯決策困難量表
 *
 * 架構依照 Gati 的生涯決策困難問卷（CDDQ）：3 大類、10 個小項，32 題計分 + 2 題效度題，9 點量表。
 *
 * 注意：題目文字是依照各小項定義自行撰寫的「試行版」，不是田秀蘭（2001）中文版的原題。
 *    取得授權後，只要替換 ITEMS 的 text（小項與題數不變），計分與結果頁都不用改。
 *    若改用 CAAS 或自編量表，需要一併調整 SUBSCALES / CATEGORIES。
 */

export const SCALE_MIN = 1;
export const SCALE_MAX = 9;
export const SCALE_LABELS = { min: "完全不像我", max: "完全像我" };
export const ITEM_VERSION = "trial-2026-10";

export type CategoryKey = "readiness" | "information" | "inconsistent";
export type SubscaleKey =
  | "motivation"
  | "indecisiveness"
  | "beliefs"
  | "process"
  | "self"
  | "occupations"
  | "ways"
  | "unreliable"
  | "internal"
  | "external";

export const CATEGORIES: Record<CategoryKey, { label: string; short: string; summary: string }> = {
  readiness: {
    label: "缺乏準備",
    short: "準備",
    summary: "還沒準備好開始做決定：動機、做決定的習慣，或對生涯抱持的信念，讓你停在起點。",
  },
  information: {
    label: "缺乏資訊",
    short: "資訊",
    summary: "想做決定，但手上的資訊還不夠：對自己、對職業，或不知道去哪裡找答案。",
  },
  inconsistent: {
    label: "資訊不一致",
    short: "一致",
    summary: "資訊不少，卻互相拉扯：來源不可靠、自己的想法打架，或和重要他人的期待不同。",
  },
};

export const SUBSCALES: Record<
  SubscaleKey,
  { category: CategoryKey; label: string; explain: string }
> = {
  motivation: {
    category: "readiness",
    label: "動機",
    explain:
      "你可能覺得現在還不需要做決定，或對規劃未來提不起勁。這很常見，但「等時間到了再說」往往會讓選擇變少。可以先從閱讀幾篇系友故事開始，看看別人是在什麼時間點開始認真想這件事的。",
  },
  indecisiveness: {
    category: "readiness",
    label: "猶豫不決",
    explain:
      "做決定本身對你來說就比較吃力，容易反覆懷疑、需要別人確認。這和特定的選項無關，而是一種做決定的習慣。試著把大決定拆成小步驟，或先做一個「可以反悔」的小實驗。",
  },
  beliefs: {
    category: "readiness",
    label: "不合理的信念",
    explain:
      "你可能相信世上只有一條最適合的路、選錯就回不了頭，或期待一份工作滿足所有理想。這些信念會讓每個選擇都顯得過於沉重。系友的故事裡，大多數人的路都轉過好幾次彎。",
  },
  process: {
    category: "information",
    label: "不了解決策步驟",
    explain:
      "你還不太確定做生涯決定應該經過哪些步驟、哪些因素該優先考慮。一個常見的起點是：先列出在意的條件，再為每個選項蒐集資訊，最後才比較。",
  },
  self: {
    category: "information",
    label: "對自己的了解",
    explain:
      "你對自己的興趣、能力或在乎的價值還不夠篤定。這需要透過行動來釐清：修課、實習、和不同領域的人聊聊，都是在收集關於自己的資料。",
  },
  occupations: {
    category: "information",
    label: "對職業的了解",
    explain:
      "你對心理系畢業後的出路、各種職業的實際工作內容還不夠熟悉。最快的方法是直接問在那個位置上的人——線上提問或約一杯咖啡都可以。",
  },
  ways: {
    category: "information",
    label: "找資訊的方法",
    explain:
      "你不太知道可以去哪裡、向誰找生涯的資訊。系友園地就是為了這件事而存在：每位願意被聯絡的系友，都在等學弟妹的一個問題。",
  },
  unreliable: {
    category: "inconsistent",
    label: "不可靠的資訊",
    explain:
      "你手上的資訊彼此矛盾，或不確定是否正確。網路上的說法常常以偏概全，找一兩位真正在該領域工作的系友核對，會比讀十篇文章更有用。",
  },
  internal: {
    category: "inconsistent",
    label: "內在衝突",
    explain:
      "你想要的東西彼此拉扯：喜歡的不一定擅長、想要的條件很難同時滿足，或不想放棄任何可能。和曾經做過類似取捨的系友聊聊，可以看見「取捨之後」的樣子。",
  },
  external: {
    category: "inconsistent",
    label: "外在衝突",
    explain:
      "家人或身邊重要的人對你的未來有不同的期待。這是心理系學生很常遇到的處境，不少系友也走過這段。聽聽他們怎麼溝通、怎麼找到平衡，或許能給你一些參考。",
  },
};

export const SUBSCALE_ORDER = Object.keys(SUBSCALES) as SubscaleKey[];

export type Item =
  | { id: string; text: string; subscale: SubscaleKey }
  | { id: string; text: string; validity: number };

export const ITEMS: Item[] = [
  { id: "m1", subscale: "motivation", text: "我覺得現在還不用急著決定未來的方向，時間到了自然會有答案。" },
  { id: "m2", subscale: "motivation", text: "我對規劃未來這件事，提不太起勁。" },
  { id: "m3", subscale: "motivation", text: "比起現在就面對生涯選擇，我寧願先把這件事放著。" },
  { id: "i1", subscale: "indecisiveness", text: "一般來說，做決定對我來說是一件困難的事。" },
  { id: "i2", subscale: "indecisiveness", text: "面對選擇時，我常常需要別人的肯定，才敢做決定。" },
  { id: "i3", subscale: "indecisiveness", text: "做了決定之後，我常常反覆懷疑自己是否選對。" },
  { id: "i4", subscale: "indecisiveness", text: "選項一多，我就容易卡住、遲遲無法決定。" },
  { id: "b1", subscale: "beliefs", text: "我相信世界上只有一條真正適合我的路，選錯了就很難回頭。" },
  { id: "b2", subscale: "beliefs", text: "我期待未來的工作，能滿足我所有的需求與理想。" },
  { id: "b3", subscale: "beliefs", text: "我覺得生涯的選擇是一次性的，一旦決定就很難改變。" },
  { id: "p1", subscale: "process", text: "我不知道做生涯決定時，應該經過哪些步驟。" },
  { id: "v1", validity: 2, text: "為了確認作答品質，這一題請選擇「2」。" },
  { id: "p2", subscale: "process", text: "我不清楚做決定時，哪些因素應該優先考慮。" },
  { id: "p3", subscale: "process", text: "我不知道該怎麼把手上的資訊整合起來，做出一個決定。" },
  { id: "s1", subscale: "self", text: "我還不太確定自己真正感興趣的是什麼。" },
  { id: "s2", subscale: "self", text: "我不太清楚自己的能力或強項在哪裡。" },
  { id: "s3", subscale: "self", text: "我不確定未來的工作裡，什麼對我最重要（例如收入、穩定、意義）。" },
  { id: "s4", subscale: "self", text: "我不知道自己現在的興趣或能力，未來會不會改變。" },
  { id: "o1", subscale: "occupations", text: "我對心理系畢業後可以走的路，認識得還不夠多。" },
  { id: "o2", subscale: "occupations", text: "我不太清楚各種職業實際的工作內容。" },
  { id: "o3", subscale: "occupations", text: "我不知道各個領域未來的發展前景如何。" },
  { id: "w1", subscale: "ways", text: "我不知道可以從哪裡取得關於職業或升學的可靠資訊。" },
  { id: "w2", subscale: "ways", text: "我不知道可以向誰請教生涯方面的問題。" },
  { id: "u1", subscale: "unreliable", text: "我得到的生涯資訊常常互相矛盾，讓我無所適從。" },
  { id: "u2", subscale: "unreliable", text: "我不確定自己對某些職業的了解是否正確。" },
  { id: "u3", subscale: "unreliable", text: "關於我的能力或個性，別人給我的回饋常常不一致。" },
  { id: "c1", subscale: "internal", text: "我感興趣的選項，常常不是我能力最適合的選項。" },
  { id: "c2", subscale: "internal", text: "我很難在幾個都很吸引我的選項之間做取捨。" },
  { id: "v2", validity: 8, text: "這一題請選擇「8」。" },
  { id: "c3", subscale: "internal", text: "我在意的條件（例如興趣、收入、穩定）很難在同一個選擇裡同時滿足。" },
  { id: "c4", subscale: "internal", text: "我不願意為了某個選擇，放棄其他的可能。" },
  { id: "c5", subscale: "internal", text: "我真正喜歡的領域，進入的門檻或機會讓我很擔心。" },
  { id: "e1", subscale: "external", text: "對於我的未來，身邊重要的人（例如家人）和我有不同的期待。" },
  { id: "e2", subscale: "external", text: "身邊重要的人給我的建議彼此不一致，讓我難以決定。" },
];

// ─── 附加題：產生推薦系統的標籤 ─────────────────────────

export const STAGE_OPTIONS = [
  { value: "early", label: "大學部低年級，還在探索" },
  { value: "senior", label: "大學部高年級，準備畢業後的出路" },
  { value: "grad", label: "碩博士班在學" },
  { value: "new_grad", label: "剛畢業，正在找方向" },
  { value: "working", label: "已經在工作，考慮下一步" },
] as const;

export const GOAL_OPTIONS = [
  { value: "direction", label: "找到自己想走的方向" },
  { value: "occupation", label: "了解某個職業實際在做什麼" },
  { value: "grad_school", label: "決定要不要讀研究所或出國" },
  { value: "job_search", label: "準備求職（履歷、面試、實習）" },
  { value: "switch", label: "考慮轉換跑道" },
  { value: "family", label: "處理和家人期待之間的落差" },
  { value: "exam", label: "準備國考或證照" },
  { value: "startup", label: "想創業或做自己的計畫" },
] as const;

export type StageValue = (typeof STAGE_OPTIONS)[number]["value"];
export type GoalValue = (typeof GOAL_OPTIONS)[number]["value"];

export type CddqAnswers = {
  version: string;
  items: Record<string, number>;
  interests: string[];
  stage: StageValue;
  goal: GoalValue;
};

export type Level = "low" | "moderate" | "high";

export type CddqScores = {
  subscales: Record<SubscaleKey, number>;
  categories: Record<CategoryKey, number>;
  total: number;
  /** 由高到低，最主要的 2–3 個困難 */
  top: SubscaleKey[];
  validity: { ok: boolean; failed: string[] };
};

/** Gati 的慣例：平均 > 6.33 為顯著困難、< 3.67 可以忽略 */
export function levelOf(score: number): Level {
  if (score > 6.33) return "high";
  if (score >= 3.67) return "moderate";
  return "low";
}

export const LEVEL_LABEL: Record<Level, string> = { low: "穩定", moderate: "有些卡關", high: "明顯卡關" };

const round2 = (n: number) => Math.round(n * 100) / 100;
const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;

export function validateCddqItems(items: Record<string, unknown>): string | null {
  for (const item of ITEMS) {
    const v = items[item.id];
    if (typeof v !== "number" || !Number.isInteger(v) || v < SCALE_MIN || v > SCALE_MAX) {
      return "還有題目沒有作答。";
    }
  }
  return null;
}

export function scoreCddq(items: Record<string, number>): CddqScores {
  const bySub = {} as Record<SubscaleKey, number[]>;
  const failed: string[] = [];
  for (const item of ITEMS) {
    const v = items[item.id];
    if ("validity" in item) {
      if (Math.abs(v - item.validity) > 1) failed.push(item.id);
      continue;
    }
    (bySub[item.subscale] ??= []).push(v);
  }

  const subscales = {} as Record<SubscaleKey, number>;
  for (const key of SUBSCALE_ORDER) subscales[key] = round2(mean(bySub[key]));

  const categories = {} as Record<CategoryKey, number>;
  for (const cat of Object.keys(CATEGORIES) as CategoryKey[]) {
    categories[cat] = round2(mean(SUBSCALE_ORDER.filter((k) => SUBSCALES[k].category === cat).map((k) => subscales[k])));
  }

  const ranked = [...SUBSCALE_ORDER].sort((a, b) => subscales[b] - subscales[a]);
  // 至少列出 2 個；第 3 個只有在也達到「有些卡關」時才列
  const top = ranked.slice(0, 3).filter((k, i) => i < 2 || levelOf(subscales[k]) !== "low");

  return {
    subscales,
    categories,
    total: round2(mean(SUBSCALE_ORDER.map((k) => subscales[k]))),
    top,
    validity: { ok: failed.length === 0, failed },
  };
}

// ─── 推薦的左岸服務 ─────────────────────────────────────

export type Service = { key: string; title: string; text: string; href: string };

export const SERVICES_BY_CATEGORY: Record<CategoryKey, Service[]> = {
  readiness: [
    {
      key: "stories",
      title: "閱讀系友故事",
      text: "看看學長姐在你這個階段，是怎麼開始想這件事的。",
      href: "/alumni",
    },
    {
      key: "ai",
      title: "AI 生涯對談",
      text: "把心裡的想法說出來，讓對話幫你理出頭緒。",
      href: "/compass/ai",
    },
  ],
  information: [
    {
      key: "question",
      title: "線上提問",
      text: "寫一封信，問一位系友 1–3 個具體的問題。",
      href: "/alumni?filter=question",
    },
    {
      key: "coffee",
      title: "約一杯咖啡",
      text: "帶著 3 個問題，和系友面對面聊 30 分鐘。",
      href: "/alumni?filter=coffee",
    },
    {
      key: "directory",
      title: "逛逛系友園地",
      text: "看看心理系的人，都走到了哪些地方。",
      href: "/alumni",
    },
  ],
  inconsistent: [
    {
      key: "coffee",
      title: "和走過類似掙扎的系友約咖啡",
      text: "聽聽他們當時怎麼取捨、怎麼和家人溝通。",
      href: "/alumni?filter=coffee",
    },
    {
      key: "talk",
      title: "想聽他回來分享",
      text: "替你想聽的系友按 +1，讓系上邀請他回來演講。",
      href: "/alumni?filter=talk",
    },
  ],
};
