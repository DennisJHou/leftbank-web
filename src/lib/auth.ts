import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { one, query } from "./db";
import { randomToken, sha256 } from "./crypto";
import { deriveIdentity, type Education, type Identity } from "./identity";

const COOKIE = "lb_session";
const SESSION_DAYS = 30;

export const MAX_FAILED_LOGINS = 5;
export const LOCK_MINUTES = 15;

export type UserRow = {
  id: string;
  name: string;
  email: string;
  role_teacher: boolean;
  teacher_verified: boolean;
  status: "active" | "pending" | "suspended";
  email_verified_at: Date | null;
  created_at: Date;
};

export type CurrentUser = UserRow & {
  education: Education[];
  identity: Identity;
  photo_url: string | null;
};

export async function createSession(userId: string) {
  const token = randomToken();
  const expires = new Date(Date.now() + SESSION_DAYS * 86400_000);
  await query("insert into sessions (token_hash, user_id, expires_at) values ($1, $2, $3)", [
    sha256(token),
    userId,
    expires.toISOString(),
  ]);
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires,
  });
}

export async function destroySession() {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (token) await query("delete from sessions where token_hash = $1", [sha256(token)]);
  jar.delete(COOKIE);
}

export async function destroyAllSessions(userId: string) {
  await query("delete from sessions where user_id = $1", [userId]);
}

/** 目前登入的使用者（同一個請求只查一次）。停用或尚未驗證 email 的帳號視同未登入。 */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  // 學歷一起查回來：每個頁面的導覽列都會呼叫這裡，少一趟資料庫往返就少一份等待
  const user = await one<UserRow & { photo_url: string | null; education: Education[] }>(
    `select u.id, u.name, u.email, u.role_teacher, u.teacher_verified, u.status, u.email_verified_at, u.created_at,
            p.photo_url,
            coalesce((select json_agg(json_build_object('id', e.id, 'degree', e.degree, 'student_no', e.student_no,
                                                        'entry_year', e.entry_year, 'grad_year', e.grad_year)
                                      order by case e.degree when 'B' then 0 when 'M' then 1 else 2 end,
                                               coalesce(e.entry_year, e.grad_year))
                        from education e where e.user_id = u.id), '[]'::json) as education
       from sessions s
       join users u on u.id = s.user_id
       left join alumni_profiles p on p.user_id = u.id
      where s.token_hash = $1 and s.expires_at > now()`,
    [sha256(token)],
  );
  if (!user || user.status === "suspended" || !user.email_verified_at) return null;
  return {
    ...user,
    identity: deriveIdentity(user.education, user.role_teacher, user.teacher_verified),
  };
});

export async function getEducation(userId: string) {
  return query<Education>(
    `select id, degree, student_no, entry_year, grad_year from education where user_id = $1
      order by case degree when 'B' then 0 when 'M' then 1 else 2 end, coalesce(entry_year, grad_year)`,
    [userId],
  );
}

/** 需要登入；未登入時導向登入頁，登入後回到 next */
export async function requireUser(next: string): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(next)}`);
  return user;
}

/** 需要已啟用（審核通過）的帳號 */
export async function requireActiveUser(next: string): Promise<CurrentUser> {
  const user = await requireUser(next);
  if (user.status !== "active") redirect("/me?pending=1");
  return user;
}
