/** 生涯報告相關的固定文案（前後端共用）。語氣依 DESIGN.md：平實、溫暖，不出現「診斷」「障礙」。 */
import type { SubscaleKey } from "../cddq";
import type { Component, Route, StepKey } from "./types";

export const STEP_LABELS: Record<StepKey, string> = {
  profile: "讀你的困難剖面",
  stories: "找走過類似處境的系友",
  resources: "上網查臺大與校外的資訊",
  plan: "整理成你的行動建議",
};
export const STEP_ORDER: StepKey[] = ["profile", "stories", "resources", "plan"];

export const ROUTE_LABEL: Record<Route, { title: string; text: string }> = {
  clarify_first: {
    title: "先和人聊聊，再看分數",
    text: "這次的作答方式，讓分數不太能代表你真實的狀況。比起直接給建議，先和一個人聊聊會更有幫助。",
  },
  counseling: {
    title: "建議找心理師一起談",
    text: "你卡住的地方，和做決定時的心情、想法或身邊的人有關。這類困難，有人陪著談通常比自己找資料更有幫助。",
  },
  guided: {
    title: "有人陪著，一步一步來",
    text: "你卡住的地方不只一種。建議約一位系友聊聊，再找職涯中心的諮詢師一起整理。",
  },
  self_help: {
    title: "先從找資訊開始",
    text: "你主要卡在資訊不夠。這類困難最適合自己動手找答案，也別忘了找一個人核對。",
  },
};

export const CONFIDENCE_NOTE = {
  medium: "這份結果有一些保留：你的作答方式或分數分布，讓我們不太確定哪一項最突出。下面的建議可以當作參考，不必照單全收。",
  low: "這次的結果不太能代表你。可能是作答得比較快，或分數幾乎都一樣。",
};

export const CREDIBILITY_REASON = { too_fast: "作答速度比一般快很多", straight_line: "大部分題目選了同一個分數" } as const;

/** 轉介區塊（固定模板，不由 AI 產生） */
export const REFERRAL = {
  counseling: {
    title: "可以先找的人",
    lead: "心理師不只處理「很嚴重」的事。反覆猶豫、和家人意見不同、對未來很焦慮，都很適合去談談。",
    items: [
      { title: "臺大學生心理輔導中心", text: "預約初談，和心理師一對一聊聊。", href: "https://scc_osa.ntu.edu.tw/" },
      { title: "臺大職涯中心一對一諮詢", text: "整理方向、選項與資訊。", href: "https://career.ntu.edu.tw/Alumni/1-1appoint" },
    ],
    hotline: "如果最近壓力很大、睡不好或有傷害自己的念頭，請撥 24 小時安心專線 1925，或生命線 1995。",
  },
  clarify_first: {
    title: "建議的下一步",
    lead: "先找一個人聊聊你現在的狀況，兩週後如果想，可以再做一次問卷。",
    items: [
      { title: "臺大職涯中心一對一諮詢", text: "和諮詢師聊聊你對未來的想法。", href: "https://career.ntu.edu.tw/Alumni/1-1appoint" },
      { title: "臺大學生心理輔導中心", text: "如果最近心情或壓力讓你難以專心，可以預約初談。", href: "https://scc_osa.ntu.edu.tw/" },
    ],
    hotline: "如果最近壓力很大，請撥 24 小時安心專線 1925。",
  },
} as const;

export const FALLBACK_TEXT = "這次沒有整理出個人化的建議，先依你的結果推薦下面的服務與系友。";

export const COMPONENT_LABEL: Record<Component, string> = {
  individualized_feedback: "個別化解釋",
  world_of_work_info: "職業世界資訊",
  writing_exercise: "書寫練習",
  modeling: "看見榜樣",
  support_network: "支持網絡",
  counselor_support: "有人陪談",
  values_clarification: "價值澄清",
  decision_psychoeducation: "做決定的方法",
};

/** 10 個小項各 2 則書寫練習範例：給提示詞當參考，也是示範模式的內容 */
export const WRITING_EXAMPLES: Record<SubscaleKey, [string, string]> = {
  motivation: [
    "寫下三個「現在還不想決定」的理由，在每一個旁邊寫：如果一年後還是這樣，我會有什麼感覺？",
    "想像五年後的某個週二早上，你在做什麼？寫 5 句就好，不用合理。",
  ],
  indecisiveness: [
    "回想一個你最後做成的決定（再小都可以）。寫下當時是什麼讓你終於選了。",
    "把眼前的選擇寫成「這個月可以試試看、而且可以反悔」的版本。",
  ],
  beliefs: [
    "寫下一句你對生涯深信的話（例如「選錯就回不去了」），再寫一個你知道的反例。",
    "如果這個決定之後可以修改兩次，你現在會怎麼選？",
  ],
  process: [
    "列出你做決定時在意的 5 個條件，排出前 3 名。",
    "把目前的選項寫在左邊、條件寫在上面，做一張小表格，先不用填滿。",
  ],
  self: [
    "寫下最近一次「時間過得很快」的經驗：你在做什麼？和誰？",
    "請三個認識你的人各說一個你的優點，抄下來，看看有什麼共同點。",
  ],
  occupations: [
    "挑一個有興趣的職業，寫下你想像中它的一天。之後和系友聊完，再對照看看。",
    "寫下 3 個關於這份工作你最想問、但網路上查不到的問題。",
  ],
  ways: [
    "畫一張圖：中間是你，外圈寫下可以問生涯問題的人或地方。哪一圈最空？",
    "寫下這個月可以聯絡的一個人，以及你想問他的第一句話。",
  ],
  unreliable: [
    "寫下一個你聽過、但不確定是不是真的說法，它是從哪裡來的？",
    "把你對某個職業的印象分成「親眼看過」「聽別人說」「網路上看到」三欄。",
  ],
  internal: [
    "寫下兩個彼此拉扯的想要，各寫一段：如果只能保留它，我會得到什麼、失去什麼？",
    "把在意的條件分成「一定要」「最好有」「可以放棄」三欄。",
  ],
  external: [
    "兩欄對照：左邊寫「如果不考慮家人」我會怎麼選，右邊寫家人希望的。中間寫：兩邊都在乎的是什麼？",
    "寫下家人最擔心的一件事，以及你可以怎麼讓他們放心一點。",
  ],
};

export const CONSENT_AGENT_LINE = "做完問卷後，你的分數與三題選擇題的答案（不含姓名、學號、email）會交給 AI 服務，整理成給你的建議。";
