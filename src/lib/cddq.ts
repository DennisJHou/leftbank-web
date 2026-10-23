/**
 * 職涯羅盤（基礎版）：生涯決定困難問卷
 *
 * 題目：田秀蘭「生涯決定困難問卷」（國科會專題研究計畫問卷，1998）的第 1–44 題，即 Gati、Krausz 與 Osipow（1996）
 *   CDDQ 44 題的中文版（田秀蘭，2001）。第 45–50 題是本土題，2001 年的分析並未納入，所以這裡不用。
 * 架構：3 大類、10 個小項；各小項題數為 3、4、3、3、8、4、2、6、7、4（與 2001 年論文表 1 相同）。
 *   問卷本身沒有標示小項，小項依題號順序與題數歸屬，授權確認時請田老師核對。
 * 作答：1–9，「與我的情況很不相似」到「與我的情況非常相似」，分數越高代表越困難。
 * 只放原題，沒有作答品質檢核題；程式仍保留檢核題的機制（Item 的 validity 變體、scores.validity），以相容既有紀錄與後台。
 *
 * ⚠️ 尚未取得田秀蘭老師的授權。授權之前，這個網站不可以對外公開部署；只用在本機，給田老師看題目在網站上的樣子。
 */

export const SCALE_MIN = 1;
export const SCALE_MAX = 9;
export const SCALE_LABELS = { min: "與我的情況很不相似", max: "與我的情況非常相似" };
export const SCALE_INSTRUCTION =
  "如果句子描述的內容與你的情況非常相似，請選 9 或接近 9 的數字；如果非常不相似，請選 1 或接近 1 的數字。請不要遺漏任何一題，也不需要在任何一題花太多時間思考。";
export const ITEM_VERSION = "tien-1998-draft";

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
  { id: "q1", subscale: "motivation", text: "我不想現在就決定未來的生涯發展方向。" },
  { id: "q2", subscale: "motivation", text: "工作並不是我生命裡最重要的一件事。" },
  { id: "q3", subscale: "motivation", text: "船到橋頭自然直，等時候到了，自然會有一個適合我的決定。" },
  { id: "q4", subscale: "indecisiveness", text: "我覺得自己是個很難做決定的人。" },
  { id: "q5", subscale: "indecisiveness", text: "通常在他人的肯定或支持之後，我才敢作成決定。" },
  { id: "q6", subscale: "indecisiveness", text: "我平常就不太喜歡對任何事情做承諾。" },
  { id: "q7", subscale: "indecisiveness", text: "我很害怕面對失敗。" },
  { id: "q8", subscale: "beliefs", text: "我相信只要有一份工作，連帶著我的個人問題也能得到解決。" },
  { id: "q9", subscale: "beliefs", text: "我相信有一份理想的工作可以滿足我所有的期望。" },
  { id: "q10", subscale: "beliefs", text: "一次的決定就可能影響我一輩子的發展，我不得不謹慎為之。" },
  { id: "q11", subscale: "process", text: "我不知道做決定要經歷哪些步驟。" },
  { id: "q12", subscale: "process", text: "做決定時，我不知道應該考慮哪些因素。" },
  { id: "q13", subscale: "process", text: "我不知道如何將對自己的認識以及對職業的認識作一連結。" },
  { id: "q14", subscale: "self", text: "我不清楚自己具備哪些能力。" },
  { id: "q15", subscale: "self", text: "我不了解自己的人格特質。" },
  { id: "q16", subscale: "self", text: "我不知道自己究竟適合怎樣的工作。" },
  { id: "q17", subscale: "self", text: "我不知道自己有哪些與職業相關的興趣偏好。" },
  { id: "q18", subscale: "self", text: "我不確定自己未來是否能學得在工作上所需具備的能力。" },
  { id: "q19", subscale: "self", text: "我不知道自己的人格特質在未來會有什麼改變。" },
  { id: "q20", subscale: "self", text: "我不知道在未來還有哪些職業選擇會是適合自己的。" },
  { id: "q21", subscale: "self", text: "我不知道自己未來還會發展出哪些職業興趣。" },
  { id: "q22", subscale: "occupations", text: "我不知道目前可以接觸哪些不同的職業或訓練機會。" },
  { id: "q23", subscale: "occupations", text: "我不清楚在不同的職業或訓練機會裡，有哪些內容會是自己有興趣的。" },
  { id: "q24", subscale: "occupations", text: "我不清楚工作世界未來會有哪些不同的職業或訓練機會。" },
  { id: "q25", subscale: "occupations", text: "我不清楚未來的職業或生涯訓練機會裡會有哪些不同的內容。" },
  { id: "q26", subscale: "ways", text: "我不知道還有哪些方式可以更了解自己。" },
  { id: "q27", subscale: "ways", text: "我不清楚還有哪些管道可以增進對工作世界的認識。" },
  { id: "q28", subscale: "unreliable", text: "我覺得對自己能力的認識是不可靠的。" },
  { id: "q29", subscale: "unreliable", text: "我覺得自己對自己人格特質的認識是不可靠的。" },
  { id: "q30", subscale: "unreliable", text: "對於自己適合從事哪方面的職業，我覺得我的看法並不是十分可靠的。" },
  { id: "q31", subscale: "unreliable", text: "我對自己職業興趣的認識並不是完全正確的。" },
  { id: "q32", subscale: "unreliable", text: "我不確定是否有某一項特定的職業或訓練機會。" },
  { id: "q33", subscale: "unreliable", text: "我對職業或訓練機會的所得資料並不是完全正確的。" },
  { id: "q34", subscale: "internal", text: "當面臨衝突時，我不太願意在各個考慮因素之間做一妥協。" },
  { id: "q35", subscale: "internal", text: "有好幾個同樣吸引我的職業，讓我不知道如何做決定。" },
  { id: "q36", subscale: "internal", text: "我是可以有幾個工作機會，但都不太喜歡，因此很難決定。" },
  { id: "q37", subscale: "internal", text: "在我喜歡的職業選擇裡，有一兩個地方是我不喜歡的。" },
  { id: "q38", subscale: "internal", text: "我的不同偏好無法在同一個職業選擇裡同時得到。" },
  { id: "q39", subscale: "internal", text: "我知道自己喜歡做什麼，但覺得自己在那方面能力不夠。" },
  { id: "q40", subscale: "internal", text: "我的能力遠超過我所喜歡職業對我的要求。" },
  { id: "q41", subscale: "external", text: "我所期望的生涯選擇與家人對我的期望有所不同。" },
  { id: "q42", subscale: "external", text: "在我所偏好的工作性質方面，家人的看法與我的看法不同。" },
  { id: "q43", subscale: "external", text: "家人及師長對我的職業選擇有不同的看法。" },
  { id: "q44", subscale: "external", text: "家人及師長對我所期望的工作特質有不同的看法。" },
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
