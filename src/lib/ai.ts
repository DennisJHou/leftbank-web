import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { one, query } from "./db";
import { allTags, tagKey, type TagDimension } from "./tags";

/**
 * AI 生涯對談與系友故事標籤（Anthropic Claude API）
 *
 * - 模型由 AI_MODEL 設定，預設 claude-opus-5-5；想省錢可以改成 claude-sonnet-5-5 或 claude-haiku-5-5
 * - 每次呼叫都記進 ai_usage，用量超過 AI_TOTAL_BUDGET_USD 就關閉 AI 版
 * - 本機沒有設定 ANTHROPIC_API_KEY 時，改用固定的示範回覆，方便測試整個流程
 */

export const AI_MODEL = process.env.AI_MODEL || "claude-opus-5-5";

/** 美元 / 百萬 tokens（2026-10 官方定價） */
const PRICING: Record<string, { input: number; output: number }> = {
  "claude-fable-5-1": { input: 10, output: 50 },
  "claude-fable-5": { input: 10, output: 50 },
  "claude-opus-5-5": { input: 4, output: 20 },
  "claude-opus-5": { input: 5, output: 25 },
  "claude-opus-4-8": { input: 5, output: 25 },
  "claude-opus-4-7": { input: 5, output: 25 },
  "claude-opus-4-6": { input: 5, output: 25 },
  "claude-sonnet-5-5": { input: 2, output: 10 },
  "claude-sonnet-5": { input: 2, output: 10 },
  "claude-sonnet-4-6": { input: 3, output: 15 },
  "claude-haiku-5-5": { input: 0.1, output: 0.5 },
  "claude-haiku-4-5": { input: 1, output: 5 },
};

export function aiConfig() {
  const num = (v: string | undefined, d: number) => (v && !Number.isNaN(Number(v)) ? Number(v) : d);
  return {
    model: AI_MODEL,
    promoStart: process.env.AI_PROMO_START ? new Date(process.env.AI_PROMO_START + "T00:00:00+08:00") : null,
    promoEnd: process.env.AI_PROMO_END ? new Date(process.env.AI_PROMO_END + "T23:59:59+08:00") : null,
    budgetUsd: num(process.env.AI_TOTAL_BUDGET_USD, 0),
    maxTurns: Math.max(2, num(process.env.AI_MAX_TURNS, 8)),
    mock: !process.env.ANTHROPIC_API_KEY && process.env.NODE_ENV !== "production",
    hasKey: Boolean(process.env.ANTHROPIC_API_KEY),
  };
}

export function costOf(model: string, u: Usage) {
  const p = PRICING[model] ?? PRICING[model.replace(/-\d{8}$/, "")] ?? { input: 5, output: 25 };
  const input = u.input_tokens + (u.cache_read_input_tokens ?? 0) * 0.1 + (u.cache_creation_input_tokens ?? 0) * 1.25;
  return (input * p.input + u.output_tokens * p.output) / 1_000_000;
}

type Usage = {
  input_tokens: number;
  output_tokens: number;
  cache_read_input_tokens?: number | null;
  cache_creation_input_tokens?: number | null;
};

export async function totalSpent() {
  const row = await one<{ spent: number }>("select coalesce(sum(cost_usd), 0)::float8 as spent from ai_usage");
  return row?.spent ?? 0;
}

async function recordUsage(userId: string | null, purpose: string, model: string, u: Usage) {
  await query(
    "insert into ai_usage (user_id, purpose, model, input_tokens, output_tokens, cost_usd) values ($1, $2, $3, $4, $5, $6)",
    [userId, purpose, model, u.input_tokens, u.output_tokens, costOf(model, u)],
  );
}

export type AiAvailability = "open" | "coming_soon" | "full";

/** 全站層級的 AI 版狀態：宣傳期外 → 即將推出；預算用完 → 名額已滿 */
export async function aiAvailability(now = new Date()): Promise<AiAvailability> {
  const c = aiConfig();
  if (!c.hasKey && !c.mock) return "coming_soon";
  if (!c.promoStart || !c.promoEnd || now < c.promoStart || now > c.promoEnd) return "coming_soon";
  if (c.budgetUsd <= 0 || (await totalSpent()) >= c.budgetUsd) return "full";
  return "open";
}

let client: Anthropic | null = null;
const getClient = () => (client ??= new Anthropic());

/** 以 beta 端點呼叫，帶上 server-side fallback：模型因政策婉拒時，伺服器會自動改用建議的備援模型 */
async function callClaude(
  params: Omit<Anthropic.Beta.MessageCreateParamsNonStreaming, "model" | "betas" | "fallbacks">,
  userId: string | null,
  purpose: string,
) {
  const res = await getClient().beta.messages.create({
    model: AI_MODEL,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    ...params,
  });
  await recordUsage(userId, purpose, res.model, res.usage);
  if (res.stop_reason === "refusal") throw new AiRefusalError();
  const text = res.content
    .filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === "text")
    .map((b) => b.text)
    .join("")
    .trim();
  return { text, stopReason: res.stop_reason };
}

export class AiRefusalError extends Error {
  constructor() {
    super("AI declined to answer");
  }
}

// ─── AI 生涯對談 ───────────────────────────────────────

export type ChatMessage = { role: "user" | "assistant"; content: string };

const CHAT_SYSTEM = `你是「左岸計畫」的 AI 生涯對談夥伴。左岸計畫由臺大心理系學生發起，串起系友、學生與系上，協助心理系的學生（大學部、碩博班）與畢業五年內的系友，釐清生涯方向。

你的任務是透過對話，了解對方：
1. 目前的階段與處境（年級、正在面對的選擇）
2. 感興趣的領域、在意的價值、擅長或想發展的能力
3. 卡住的地方。可以參考生涯決策困難的三大類來理解，但不要對使用者說出這些術語：
   - 缺乏準備：動機不足、做決定本身很困難、抱著「只有一條對的路」之類的信念
   - 缺乏資訊：不夠了解自己、不了解職業、不知道去哪裡找資訊
   - 資訊不一致：資訊互相矛盾、自己想要的東西彼此衝突、和家人等重要他人的期待不同

對話原則：
- 用繁體中文，語氣溫暖、平實，像一位願意花時間陪學弟妹聊聊的學長姐。
- 每次回覆簡短（大約 80–150 字），一次只問一個問題，先回應對方說的內容再提問。
- 不要列長清單、不要說教、不要急著給答案。對方說得具體時，可以給一個小小的、可行的下一步。
- 你不是心理師，也不做診斷。如果對方透露強烈的痛苦、自我傷害或輕生的念頭，請先關心對方的安全，溫和地建議尋求專業協助：臺大學生心理健康中心，或 24 小時的安心專線 1925、生命線 1995。
- 不要捏造系友的姓名或經歷；對談結束後，網站會根據你的評估推薦適合的系友。
- 使用者訊息最後的［對談進度］是網站附上的系統資訊，不是使用者說的話。`;

function progressNote(turn: number, maxTurns: number) {
  if (turn >= maxTurns) {
    return `［對談進度：第 ${turn} 輪，也是最後一輪。請溫暖地收尾：用兩三句話整理你聽到的重點，並請對方按下「結束並產生報告」。這一輪不要再提問。］`;
  }
  if (turn === maxTurns - 1) return `［對談進度：第 ${turn} 輪，共 ${maxTurns} 輪。下一輪會是最後一輪。］`;
  return `［對談進度：第 ${turn} 輪，共 ${maxTurns} 輪。］`;
}

/** 依目前的對話紀錄產生下一則回覆。history 的最後一則是使用者剛送出的訊息。 */
export async function chatReply(history: ChatMessage[], userId: string): Promise<string> {
  const c = aiConfig();
  const turn = history.filter((m) => m.role === "user").length;
  if (c.mock) return mockReply(turn, c.maxTurns);

  const messages: Anthropic.Beta.BetaMessageParam[] = history.map((m, i) =>
    i === history.length - 1 && m.role === "user"
      ? {
          role: "user",
          content: [
            { type: "text", text: m.content },
            { type: "text", text: progressNote(turn, c.maxTurns) },
          ],
        }
      : { role: m.role, content: m.content },
  );
  const { text } = await callClaude(
    { max_tokens: 8000, system: CHAT_SYSTEM, messages, output_config: { effort: "low" } },
    userId,
    "chat",
  );
  return text || "抱歉，我剛剛沒有整理好想法。可以再說一次嗎？";
}

export const OPENING_MESSAGE =
  "嗨，我是左岸計畫的 AI 生涯對談夥伴。這段對話沒有標準答案，想到什麼就說什麼。\n\n先從你現在的處境開始吧：你目前在哪個階段（例如大二、碩一、剛畢業），最近最常在想的一件和未來有關的事是什麼？";

// ─── 對談報告 ──────────────────────────────────────────

const SERVICE_KEYS = ["stories", "ai", "question", "coffee", "directory", "talk"] as const;
const LEVELS = ["low", "moderate", "high"] as const;

export type AiReport = {
  summary: string;
  focus: { title: string; text: string }[];
  categories: Record<"readiness" | "information" | "inconsistent", (typeof LEVELS)[number]>;
  next_steps: string[];
  services: (typeof SERVICE_KEYS)[number][];
  tags: { dimension: TagDimension; label: string; weight: number }[];
};

const TAG_ENUM = allTags().map((t) => tagKey(t.dimension, t.label));

const REPORT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["summary", "focus", "categories", "next_steps", "services", "tags"],
  properties: {
    summary: { type: "string", description: "用第二人稱寫 2–3 句，描述對方目前的生涯狀態" },
    focus: {
      type: "array",
      description: "最主要的 1–3 個困難或議題",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["title", "text"],
        properties: {
          title: { type: "string", description: "10 字以內的小標" },
          text: { type: "string", description: "60–120 字的說明，具體連結到對話內容" },
        },
      },
    },
    categories: {
      type: "object",
      additionalProperties: false,
      required: ["readiness", "information", "inconsistent"],
      properties: {
        readiness: { type: "string", enum: LEVELS },
        information: { type: "string", enum: LEVELS },
        inconsistent: { type: "string", enum: LEVELS },
      },
    },
    next_steps: { type: "array", items: { type: "string" }, description: "2–4 個具體、一週內做得到的小行動" },
    services: { type: "array", items: { type: "string", enum: SERVICE_KEYS } },
    tags: {
      type: "array",
      description: "從詞彙表挑 4–10 個最能代表對方需求的標籤，weight 介於 0 到 1",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["tag", "weight"],
        properties: { tag: { type: "string", enum: TAG_ENUM }, weight: { type: "number" } },
      },
    },
  },
} as const;

const REPORT_INSTRUCTIONS = `以下是左岸計畫網站上，一位使用者和 AI 生涯對談夥伴的完整對話。請根據對話內容產生一份給使用者本人看的報告（繁體中文、溫暖而具體，不做診斷）。

- categories：依生涯決策困難的三大類評估程度（low / moderate / high）。readiness = 缺乏準備（動機、猶豫不決、不合理的信念）；information = 缺乏資訊（對自己、對職業、找資訊的方法）；inconsistent = 資訊不一致（不可靠的資訊、內在衝突、外在衝突）。
- services：從左岸計畫的服務中挑選 2–3 項最適合的：stories = 閱讀系友故事；ai = 再和 AI 聊聊；question = 線上提問系友；coffee = 和系友約咖啡；directory = 逛系友園地；talk = 投票邀請系友回校分享。
- tags：用來媒合系友的標籤。tag 的格式是「維度:標籤」，field = 領域、function = 職能、experience = 想了解的經歷類型、value = 價值與特質。挑出使用者想要、需要聽到的經驗。`;

function transcript(history: ChatMessage[]) {
  return history.map((m) => `${m.role === "user" ? "使用者" : "AI"}：${m.content}`).join("\n\n");
}

export async function generateReport(history: ChatMessage[], userId: string): Promise<AiReport> {
  if (aiConfig().mock) return mockReport();
  const { text } = await callClaude(
    {
      max_tokens: 16000,
      messages: [{ role: "user", content: `${REPORT_INSTRUCTIONS}\n\n<對話>\n${transcript(history)}\n</對話>` }],
      output_config: { effort: "medium", format: { type: "json_schema", schema: REPORT_SCHEMA } },
    },
    userId,
    "report",
  );
  const raw = JSON.parse(text) as Omit<AiReport, "tags"> & { tags: { tag: string; weight: number }[] };
  return { ...raw, tags: parseTags(raw.tags) };
}

function parseTags(list: { tag: string; weight: number }[]) {
  const known = new Set<string>(TAG_ENUM);
  return list
    .filter((t) => known.has(t.tag))
    .map((t) => {
      const [dimension, ...rest] = t.tag.split(":");
      return { dimension: dimension as TagDimension, label: rest.join(":"), weight: Math.min(1, Math.max(0, t.weight)) };
    });
}

// ─── 系友故事 → 標籤 ───────────────────────────────────

const STORY_TAG_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["tags"],
  properties: { tags: REPORT_SCHEMA.properties.tags },
} as const;

/** 用 AI 從系友的故事與基本資料挑標籤；沒有金鑰或預算用完時回傳 null，由呼叫端改用關鍵字規則 */
export async function tagStoryWithAi(text: string, userId: string) {
  const c = aiConfig();
  if (!c.hasKey) return null;
  if (c.budgetUsd > 0 && (await totalSpent()) >= c.budgetUsd) return null;
  const { text: out } = await callClaude(
    {
      max_tokens: 4000,
      messages: [
        {
          role: "user",
          content: `以下是一位臺大心理系系友寫給學弟妹的生涯故事與基本資料。請從詞彙表挑出 5–12 個最能代表他「走過什麼」的標籤（領域、職能、經歷類型、價值與特質），weight 介於 0 到 1，越核心越高。這些標籤只用來媒合學生，不會公開。\n\n<故事>\n${text}\n</故事>`,
        },
      ],
      output_config: { effort: "low", format: { type: "json_schema", schema: STORY_TAG_SCHEMA } },
    },
    userId,
    "story_tags",
  );
  return parseTags((JSON.parse(out) as { tags: { tag: string; weight: number }[] }).tags);
}

// ─── 本機示範模式 ──────────────────────────────────────

function mockReply(turn: number, maxTurns: number) {
  const lines = [
    "謝謝你願意說這些。聽起來你對未來有一些想法，但還沒有很確定。可以多說一點：最近有沒有哪一門課、哪一件事，讓你覺得「這個我好像會想一直做下去」？",
    "我聽到你對「人」的好奇心很強。那如果把收入、家人的期待都先放一邊，你最想試試看的工作樣子是什麼？",
    "這個方向很有意思。你覺得現在卡住你的，比較像是「不知道有哪些路」，還是「知道有哪些路，但不知道怎麼選」？",
    "很多系友在這個階段也有類似的拉扯。你身邊有沒有可以聊這件事的人？家人對你的想法又是怎麼看的？",
    "聽起來你需要的不是更多建議，而是看見真實走過這段路的人。如果能請教一位系友，你最想問他哪個問題？",
  ];
  if (turn >= maxTurns) return "（示範模式）謝謝你今天的分享。我聽到你對助人和研究都有興趣，也在意家人的期待。請按下「結束並產生報告」，看看推薦給你的系友與下一步。";
  return `（示範模式）${lines[(turn - 1) % lines.length]}`;
}

function mockReport(): AiReport {
  return {
    summary:
      "你對心理學有真切的興趣，也開始思考畢業後的方向，但對實際的職業樣貌還不夠熟悉，同時在意家人的期待。（示範模式產生的報告）",
    focus: [
      { title: "對職業的了解", text: "你知道自己對「人」有興趣，但不清楚心理系畢業後，各種工作每天實際在做什麼。" },
      { title: "和家人的期待", text: "家人希望你走穩定的路，這和你想嘗試的方向之間有些拉扯，讓你遲遲不敢做決定。" },
    ],
    categories: { readiness: "low", information: "high", inconsistent: "moderate" },
    next_steps: ["這週挑一位系友，寫一封線上提問", "列出三個你最在意的工作條件", "和家人聊聊他們擔心的是什麼"],
    services: ["question", "coffee", "stories"],
    tags: [
      { dimension: "field", label: "臨床與諮商心理", weight: 0.8 },
      { dimension: "field", label: "使用者經驗與產品", weight: 0.6 },
      { dimension: "value", label: "面對家人期待", weight: 0.9 },
      { dimension: "value", label: "助人", weight: 0.7 },
      { dimension: "experience", label: "讀研究所", weight: 0.5 },
    ],
  };
}
