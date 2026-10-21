"use server";

import { redirect } from "next/navigation";
import { one, query } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { compassEligibility, getAiSession } from "@/lib/compass";
import { GOAL_OPTIONS, ITEM_VERSION, scoreCddq, STAGE_OPTIONS, validateCddqItems, type CddqAnswers } from "@/lib/cddq";
import { FIELD_CATEGORIES } from "@/lib/constants";
import { cddqTags } from "@/lib/tagging";
import { saveUserTags } from "@/lib/recommend";
import {
  aiAvailability,
  aiConfig,
  AiRefusalError,
  chatReply,
  generateReport,
  OPENING_MESSAGE,
  type ChatMessage,
} from "@/lib/ai";

// ─── 基礎版：量表 ──────────────────────────────────────

export async function submitCddq(payload: {
  items: Record<string, number>;
  interests: string[];
  stage: string;
  goal: string;
  consent: boolean;
}): Promise<{ error: string } | void> {
  const user = await getCurrentUser();
  const elig = compassEligibility(user);
  if (!elig.ok) return { error: elig.reason === "login" ? "請重新登入。" : elig.reason };
  if (!payload.consent) return { error: "請先閱讀並同意資料使用方式。" };

  const err = validateCddqItems(payload.items ?? {});
  if (err) return { error: err };
  const interests = (payload.interests ?? []).filter((f) => (FIELD_CATEGORIES as readonly string[]).includes(f));
  if (!interests.length) return { error: "請至少選一個感興趣的領域。" };
  if (!STAGE_OPTIONS.some((o) => o.value === payload.stage)) return { error: "請選擇你目前的階段。" };
  if (!GOAL_OPTIONS.some((o) => o.value === payload.goal)) return { error: "請選擇你最想解決的事。" };

  const answers: CddqAnswers = {
    version: ITEM_VERSION,
    items: Object.fromEntries(Object.entries(payload.items).map(([k, v]) => [k, Number(v)])),
    interests,
    stage: payload.stage as CddqAnswers["stage"],
    goal: payload.goal as CddqAnswers["goal"],
  };
  const scores = scoreCddq(answers.items);
  const row = await one<{ id: string }>(
    `insert into compass_sessions (user_id, kind, answers, scores, consent_at, completed_at)
     values ($1, 'cddq', $2::jsonb, $3::jsonb, now(), now()) returning id`,
    [user!.id, JSON.stringify(answers), JSON.stringify(scores)],
  );
  await saveUserTags(user!.id, "cddq", cddqTags(answers, scores));
  redirect(`/compass/result/${row!.id}`);
}

// ─── AI 版：生涯對談 ───────────────────────────────────

type ChatResult = { messages: ChatMessage[]; turnsLeft: number; error?: string };

async function aiGuard(): Promise<{ error: string } | { user: NonNullable<Awaited<ReturnType<typeof getCurrentUser>>> }> {
  const user = await getCurrentUser();
  const elig = compassEligibility(user);
  if (!elig.ok) return { error: elig.reason === "login" ? "請重新登入。" : elig.reason };
  return { user: user! };
}

/** 同意後開始一場對談（每個帳號限用 1 次） */
export async function startAiSession(): Promise<{ error: string } | void> {
  const g = await aiGuard();
  if ("error" in g) return { error: g.error };
  const existing = await getAiSession(g.user.id);
  if (!existing) {
    if ((await aiAvailability()) !== "open") return { error: "AI 對談目前沒有開放。" };
    await query(
      `insert into compass_sessions (user_id, kind, status, answers, consent_at)
       values ($1, 'ai', 'in_progress', $2::jsonb, now())`,
      [g.user.id, JSON.stringify({ messages: [{ role: "assistant", content: OPENING_MESSAGE }] })],
    );
  }
  redirect("/compass/ai");
}

export async function sendAiMessage(text: string): Promise<ChatResult> {
  const g = await aiGuard();
  const maxTurns = aiConfig().maxTurns;
  if ("error" in g) return { messages: [], turnsLeft: 0, error: g.error };
  const s = await getAiSession(g.user.id);
  if (!s || s.status !== "in_progress") return { messages: [], turnsLeft: 0, error: "找不到進行中的對談。" };

  const history = (s.answers as { messages: ChatMessage[] }).messages;
  const used = history.filter((m) => m.role === "user").length;
  const content = text.trim().slice(0, 1000);
  if (!content) return { messages: history, turnsLeft: maxTurns - used, error: "請輸入想說的話。" };
  if (used >= maxTurns) return { messages: history, turnsLeft: 0, error: "這次對談的輪數已經用完，請產生報告。" };

  const next: ChatMessage[] = [...history, { role: "user", content }];
  let reply: string;
  try {
    reply = await chatReply(next, g.user.id);
  } catch (e) {
    console.error("[ai] chat error", e);
    return {
      messages: history,
      turnsLeft: maxTurns - used,
      error: e instanceof AiRefusalError ? "這段話 AI 沒辦法回應，換個方式說說看？" : "AI 暫時沒有回應，請稍後再試一次。",
    };
  }
  const messages: ChatMessage[] = [...next, { role: "assistant", content: reply }];
  await query("update compass_sessions set answers = $2::jsonb where id = $1", [s.id, JSON.stringify({ messages })]);
  return { messages, turnsLeft: maxTurns - used - 1 };
}

export async function finishAiSession(): Promise<{ error: string } | void> {
  const g = await aiGuard();
  if ("error" in g) return { error: g.error };
  const s = await getAiSession(g.user.id);
  if (!s) return { error: "找不到對談紀錄。" };
  if (s.status === "completed") redirect(`/compass/result/${s.id}`);
  const history = (s.answers as { messages: ChatMessage[] }).messages;
  if (history.filter((m) => m.role === "user").length < 2) return { error: "再多聊幾句，報告會更準確（至少 2 輪）。" };

  let report;
  try {
    report = await generateReport(history, g.user.id);
  } catch (e) {
    console.error("[ai] report error", e);
    return { error: "產生報告時發生問題，請稍後再試一次。" };
  }
  await query(
    "update compass_sessions set status = 'completed', report = $2::jsonb, completed_at = now() where id = $1",
    [s.id, JSON.stringify(report)],
  );
  await saveUserTags(g.user.id, "ai", report.tags);
  redirect(`/compass/result/${s.id}`);
}
