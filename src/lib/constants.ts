/** 領域分類：系友園地篩選、系友設定、推薦系統的「領域」維度共用同一份 */
export const FIELD_CATEGORIES = [
  "臨床與諮商心理",
  "學術研究",
  "神經科學與生醫",
  "使用者經驗與產品",
  "資料科學與 AI",
  "人資與組織發展",
  "行銷、品牌與傳播",
  "商業管理與顧問",
  "教育",
  "醫療與公共衛生",
  "公共服務與非營利",
  "創業",
  "其他",
] as const;

export type Degree = "B" | "M" | "D";

export const DEGREE_LABEL: Record<Degree, string> = { B: "學士", M: "碩士", D: "博士" };

export type ContactType = "question" | "coffee";

export const CONTACT_TYPE_LABEL: Record<ContactType, string> = {
  question: "線上提問",
  coffee: "約一杯咖啡",
};

export type RequestStatus = "pending" | "accepted" | "declined" | "overdue" | "completed";

export const REQUEST_STATUS_LABEL: Record<RequestStatus, string> = {
  pending: "待回應",
  accepted: "已接受",
  declined: "已婉拒",
  overdue: "逾期",
  completed: "已完成",
};

export const MEETING_MODE_LABEL = {
  in_person: "實體",
  online: "線上",
  either: "都可以",
} as const;

/** 系友回覆的期限，以及接受後多久詢問是否完成 */
export const RESPONSE_DAYS = 14;
export const FOLLOWUP_DAYS = 14;
/** 已接受的申請，超過這個天數就不再算「進行中」，學生可以再次提出 */
export const ACCEPTED_ACTIVE_DAYS = 30;

/** 職涯羅盤：畢業幾年內可以使用 */
export const COMPASS_GRAD_YEARS = 5;

export const CONTACT_EMAIL = "leftbank.psy@gmail.com";

export const PASSWORD_MIN = 8;

/** 提問與咖啡表單的字數限制 */
export const INTRO_MIN = 30;
export const INTRO_MAX = 800;
export const QUESTION_MAX = 300;

/** 每位學生 24 小時內最多送出幾則提問／咖啡邀請（避免大量寄信打擾系友） */
export const DAILY_REQUEST_LIMIT = 5;
