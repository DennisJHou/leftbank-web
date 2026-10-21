import "server-only";
import { one } from "./db";
import type { CurrentUser } from "./auth";
import type { CddqAnswers, CddqScores } from "./cddq";
import type { AiReport, ChatMessage } from "./ai";
import { COMPASS_GRAD_YEARS } from "./constants";

export type CompassSession = {
  id: string;
  user_id: string;
  kind: "cddq" | "ai";
  status: "in_progress" | "completed";
  answers: CddqAnswers | { messages: ChatMessage[] };
  scores: CddqScores | null;
  report: AiReport | null;
  consent_at: Date;
  created_at: Date;
  completed_at: Date | null;
};

/** 使用資格：登入，且「在學中」或「畢業 5 年內」（由學歷判定），帳號已啟用 */
export function compassEligibility(user: CurrentUser | null): { ok: true } | { ok: false; reason: string } {
  if (!user) return { ok: false, reason: "login" };
  if (user.status !== "active") return { ok: false, reason: "帳號審核通過後才能使用職涯羅盤。" };
  if (!user.identity.canUseCompass) {
    return {
      ok: false,
      reason: `職涯羅盤開放給在學中，以及畢業 ${COMPASS_GRAD_YEARS} 年內的系友。如果你的學歷紀錄不正確，可以到「我的帳號」更新。`,
    };
  }
  return { ok: true };
}

/** 只回傳本人的紀錄（其他人一律當作不存在） */
export async function getOwnSession(id: string, userId: string) {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  return one<CompassSession>("select * from compass_sessions where id = $1 and user_id = $2", [id, userId]);
}

export async function previousCddq(userId: string, before: Date) {
  return one<{ id: string; scores: CddqScores; created_at: Date }>(
    `select id, scores, created_at from compass_sessions
      where user_id = $1 and kind = 'cddq' and status = 'completed' and created_at < $2
      order by created_at desc limit 1`,
    [userId, new Date(before).toISOString()],
  );
}

export async function getAiSession(userId: string) {
  return one<CompassSession>(
    "select * from compass_sessions where user_id = $1 and kind = 'ai' order by created_at desc limit 1",
    [userId],
  );
}

export const CONSENT_TEXT = [
  "你的作答會存進左岸計畫的資料庫，用來產生你的結果與推薦。",
  "只有你本人和超級管理員看得到你的個人結果。",
  "一般管理員（例如系辦）只看得到去識別化的統計與趨勢，不會知道是誰的結果。",
  "這不是心理診斷。如果你最近感到很大的壓力，歡迎找臺大學生心理健康中心聊聊，或撥打 24 小時安心專線 1925。",
];
