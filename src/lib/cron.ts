import "server-only";
import { query } from "./db";
import { followupEmail, requestOverdueEmail } from "./mail";
import { FOLLOWUP_DAYS, RESPONSE_DAYS, type ContactType } from "./constants";

/**
 * 每日排程：
 * 1. 14 天沒有回應的邀請 → 逾期，並通知學生
 * 2. 接受滿 14 天的邀請 → 寄信問系友「已經完成了嗎？」（只寄一次）
 */
export async function runDailyJobs() {
  const overdue = await query<{ type: ContactType; student_name: string; student_email: string; alumni_name: string }>(
    `with o as (
       update contact_requests set status = 'overdue'
        where status = 'pending' and created_at < now() - make_interval(days => $1)
        returning from_user, to_user, type
     )
     select o.type, s.name as student_name, s.email as student_email, a.name as alumni_name
       from o join users s on s.id = o.from_user join users a on a.id = o.to_user`,
    [RESPONSE_DAYS],
  );
  for (const r of overdue) {
    await requestOverdueEmail({ type: r.type, studentName: r.student_name, studentEmail: r.student_email, alumniName: r.alumni_name });
  }

  const followups = await query<{ type: ContactType; token: string; student_name: string; alumni_name: string; alumni_email: string }>(
    `with f as (
       update contact_requests set followup_sent_at = now()
        where status = 'accepted' and followup_sent_at is null and responded_at < now() - make_interval(days => $1)
        returning from_user, to_user, type, token
     )
     select f.type, f.token, s.name as student_name, a.name as alumni_name, a.email as alumni_email
       from f join users s on s.id = f.from_user join users a on a.id = f.to_user`,
    [FOLLOWUP_DAYS],
  );
  for (const r of followups) {
    await followupEmail({ type: r.type, token: r.token, studentName: r.student_name, alumniName: r.alumni_name, alumniEmail: r.alumni_email });
  }

  // 清掉過期的登入與驗證資料
  await query("delete from sessions where expires_at < now()");
  await query("delete from admin_sessions where expires_at < now()");
  await query("delete from auth_tokens where expires_at < now() - interval '7 days'");

  return { overdue: overdue.length, followups: followups.length };
}
