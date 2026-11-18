"use server";

import { after } from "next/server";
import { redirect } from "next/navigation";
import { one } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { compassEligibility, getOwnSession } from "@/lib/compass";
import { GOAL_OPTIONS, ITEM_VERSION, ITEMS, scoreCddq, STAGE_OPTIONS, validateCddqItems, type CddqAnswers } from "@/lib/cddq";
import { FIELD_CATEGORIES } from "@/lib/constants";
import { cddqTags } from "@/lib/tagging";
import { saveUserTags } from "@/lib/recommend";
import { diagnose } from "@/lib/diagnosis";
import { createRun, latestRun, runCount } from "@/lib/agent/store";
import { originFromHeaders, triggerRun } from "@/lib/agent/trigger";
import type { Timing } from "@/lib/agent/types";

// ─── 量表：計分 → 四步驟診斷與分流 → 背景啟動 Agent ─────────

export async function submitCddq(payload: {
  items: Record<string, number>;
  interests: string[];
  stage: string;
  goal: string;
  consent: boolean;
  timing?: { started_at?: string; per_item_ms?: Record<string, number> };
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
  const timing = cleanTiming(payload.timing);
  const scores = scoreCddq(answers.items);
  const diagnosis = diagnose(answers.items, scores, timing);

  const row = await one<{ id: string }>(
    `insert into compass_sessions (user_id, kind, answers, scores, diagnosis, timing, consent_at, completed_at)
     values ($1, 'cddq', $2::jsonb, $3::jsonb, $4::jsonb, $5::jsonb, now(), now()) returning id`,
    [user!.id, JSON.stringify(answers), JSON.stringify(scores), JSON.stringify(diagnosis), JSON.stringify(timing)],
  );
  await saveUserTags(user!.id, "cddq", cddqTags(answers, scores));

  const run = await createRun(row!.id, user!.id, diagnosis);
  if (run.status === "queued") {
    const origin = await originFromHeaders();
    after(() => triggerRun(run.id, origin));
  }
  redirect(`/compass/result/${row!.id}`);
}

/** 只接受合理範圍的時間資料（前端送來的，不能全信） */
function cleanTiming(t: { started_at?: string; per_item_ms?: Record<string, number> } | undefined): Timing {
  const out: Timing = { submitted_at: new Date().toISOString() };
  if (t?.started_at && !Number.isNaN(Date.parse(t.started_at))) {
    const started = Date.parse(t.started_at);
    if (started < Date.now() && Date.now() - started < 7 * 86400_000) out.started_at = new Date(started).toISOString();
  }
  if (t?.per_item_ms && typeof t.per_item_ms === "object") {
    const ids = new Set(ITEMS.map((i) => i.id));
    const per = Object.fromEntries(
      Object.entries(t.per_item_ms)
        .filter(([k, v]) => ids.has(k) && typeof v === "number" && v >= 0 && v < 3600_000)
        .map(([k, v]) => [k, Math.round(v)]),
    );
    if (Object.keys(per).length) out.per_item_ms = per;
  }
  return out;
}

/** 學生端「再試一次」：每次作答只能手動重試 1 次 */
export async function retryAgent(sessionId: string): Promise<{ error: string } | { ok: true }> {
  const user = await getCurrentUser();
  if (!user) return { error: "請重新登入。" };
  const s = await getOwnSession(sessionId, user.id);
  if (!s || s.kind !== "cddq") return { error: "找不到這份結果。" };
  const last = await latestRun(sessionId);
  if (!last || (last.status !== "failed" && last.status !== "fallback")) return { error: "目前不需要重試。" };
  if ((await runCount(sessionId)) >= 2) return { error: "這份結果已經重試過了。" };
  if (!s.diagnosis) return { error: "找不到這份結果。" };
  const run = await createRun(sessionId, user.id, s.diagnosis, last.attempt + 1);
  if (run.status === "queued") {
    const origin = await originFromHeaders();
    after(() => triggerRun(run.id, origin));
  }
  return { ok: true };
}
