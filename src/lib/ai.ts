import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { one, query } from "./db";
import { allTags, tagKey, type TagDimension } from "./tags";

/**
 * Claude API 共用：用量、預算、可用性、系友故事標籤；職涯羅盤的分流 Agent 在 lib/agent/
 *
 * - 模型由 AI_MODEL 設定，預設 claude-haiku-5-5；想要更好的品質可以改成 claude-sonnet-5-5 或 claude-opus-5-5
 * - 每次呼叫都記進 ai_usage，用量超過 AI_TOTAL_BUDGET_USD 就關閉 AI 版
 * - 本機沒有設定 ANTHROPIC_API_KEY 時，改用固定的示範回覆，方便測試整個流程
 */

export const AI_MODEL = process.env.AI_MODEL || "claude-haiku-5-5";

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
    mock: !process.env.ANTHROPIC_API_KEY && process.env.NODE_ENV !== "production",
    hasKey: Boolean(process.env.ANTHROPIC_API_KEY),
  };
}

export function costOf(model: string, u: Usage) {
  const p = PRICING[model] ?? PRICING[model.replace(/-\d{8}$/, "")] ?? { input: 5, output: 25 };
  const input = u.input_tokens + (u.cache_read_input_tokens ?? 0) * 0.1 + (u.cache_creation_input_tokens ?? 0) * 1.25;
  return (input * p.input + u.output_tokens * p.output) / 1_000_000;
}

export type Usage = {
  input_tokens: number;
  output_tokens: number;
  cache_read_input_tokens?: number | null;
  cache_creation_input_tokens?: number | null;
};

export async function totalSpent() {
  const row = await one<{ spent: number }>("select coalesce(sum(cost_usd), 0)::float8 as spent from ai_usage");
  return row?.spent ?? 0;
}

export async function recordUsage(userId: string | null, purpose: string, model: string, u: Usage) {
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
export const getClient = () => (client ??= new Anthropic());

/** 以 beta 端點呼叫，帶上 server-side fallback：模型因政策婉拒時，伺服器會自動改用建議的備援模型 */
export async function callClaude(
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

// ─── 舊版 AI 生涯對談（已停用，只保留型別讓舊紀錄可以唯讀顯示） ─────

export type ChatMessage = { role: "user" | "assistant"; content: string };

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

export function parseTags(list: { tag: string; weight: number }[]) {
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
