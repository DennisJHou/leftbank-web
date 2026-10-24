"use server";

import { redirect } from "next/navigation";
import { after } from "next/server";
import { one, query, tx } from "@/lib/db";
import { hashPassword, randomToken, sha256, verifyPassword } from "@/lib/crypto";
import {
  createSession,
  destroyAllSessions,
  destroySession,
  LOCK_MINUTES,
  MAX_FAILED_LOGINS,
} from "@/lib/auth";
import { appUrl, resetPasswordEmail, verifyEmail } from "@/lib/mail";
import { parseEducationForm, validateEducationForIdentity } from "@/lib/education-form";
import { PASSWORD_MIN } from "@/lib/constants";

export type FormState = { error?: string; ok?: string } | undefined;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function str(fd: FormData, key: string) {
  return String(fd.get(key) ?? "").trim();
}

/** 只允許站內路徑，避免開放式重新導向 */
function safeNext(next: string | null | undefined) {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return "/me";
  return next;
}

async function issueToken(userId: string, purpose: "verify" | "reset", hours: number) {
  const token = randomToken();
  await query(
    "insert into auth_tokens (token_hash, user_id, purpose, expires_at) values ($1, $2, $3, now() + make_interval(hours => $4))",
    [sha256(token), userId, purpose, hours],
  );
  return token;
}

// ─── 註冊 ──────────────────────────────────────────────

export async function signup(_: FormState, fd: FormData): Promise<FormState> {
  const name = str(fd, "name");
  const email = str(fd, "email").toLowerCase();
  const password = String(fd.get("password") ?? "");
  // 系友可以同時是學生或老師；學生和老師互斥
  const role = str(fd, "role");
  const flags = { student: role === "student", teacher: role === "teacher", alumni: fd.get("is_alumni") === "1" };

  if (!name) return { error: "請填寫姓名。" };
  if (name.length > 40) return { error: "姓名請在 40 字以內。" };
  if (!EMAIL_RE.test(email)) return { error: "請填寫正確的 email。" };
  if (password.length < PASSWORD_MIN) return { error: `密碼至少需要 ${PASSWORD_MIN} 個字元。` };

  const parsed = parseEducationForm(fd);
  if ("error" in parsed) return { error: parsed.error };
  const edu = parsed.rows;
  const err = validateEducationForIdentity(flags, edu);
  if (err) return { error: err };

  const roleTeacher = flags.teacher;
  // 有填學號的學生、系友：驗證 email 後立即可用；教師、沒有學號的系友：需要管理員審核
  const hasStudentNo = edu.some((e) => e.student_no);
  const status = hasStudentNo ? "active" : "pending";
  const passwordHash = await hashPassword(password);

  const existing = await one<{ id: string; email_verified_at: Date | null }>(
    "select id, email_verified_at from users where email = $1",
    [email],
  );
  if (existing?.email_verified_at) return { error: "這個 email 已經註冊過了，請直接登入；忘記密碼可以重設。" };

  const userId = await tx(async (t) => {
    let id: string;
    if (existing) {
      // 尚未驗證的帳號：以這次填寫的資料為準（真正能收信的人才能完成驗證）
      id = existing.id;
      await t.query(
        "update users set name = $2, password_hash = $3, role_teacher = $4, status = $5 where id = $1",
        [id, name, passwordHash, roleTeacher, status],
      );
      await t.query("delete from education where user_id = $1", [id]);
    } else {
      const row = await t.one<{ id: string }>(
        "insert into users (name, email, password_hash, role_teacher, status) values ($1, $2, $3, $4, $5) returning id",
        [name, email, passwordHash, roleTeacher, status],
      );
      id = row!.id;
    }
    for (const e of edu) {
      await t.query(
        "insert into education (user_id, degree, student_no, entry_year, grad_year) values ($1, $2, $3, $4, $5)",
        [id, e.degree, e.student_no, e.entry_year, e.grad_year],
      );
    }
    return id;
  });

  const token = await issueToken(userId, "verify", 24);
  after(() => verifyEmail(email, name, appUrl(`/verify?token=${token}`)));
  redirect(`/signup/check-email?email=${encodeURIComponent(email)}`);
}

export async function resendVerification(_: FormState, fd: FormData): Promise<FormState> {
  const email = str(fd, "email").toLowerCase();
  const user = await one<{ id: string; name: string; email_verified_at: Date | null; recent: boolean }>(
    `select u.id, u.name, u.email_verified_at,
            exists (select 1 from auth_tokens t where t.user_id = u.id and t.purpose = 'verify'
                    and t.created_at > now() - interval '60 seconds') as recent
       from users u where u.email = $1`,
    [email],
  );
  if (user && !user.email_verified_at && !user.recent) {
    const token = await issueToken(user.id, "verify", 24);
    after(() => verifyEmail(email, user.name, appUrl(`/verify?token=${token}`)));
  }
  return { ok: "如果這個 email 還沒驗證，我們已經重新寄出驗證信（一分鐘內只會寄一次）。" };
}

/** 驗證頁的按鈕：驗證 email 並登入（用按鈕而不是點連結就生效，避免信箱掃描器誤觸） */
export async function confirmEmail(_: FormState, fd: FormData): Promise<FormState> {
  const token = str(fd, "token");
  const row = await one<{ user_id: string; status: string }>(
    `update auth_tokens t set used_at = now()
       from users u
      where t.token_hash = $1 and t.purpose = 'verify' and t.used_at is null and t.expires_at > now() and u.id = t.user_id
      returning t.user_id, u.status`,
    [sha256(token)],
  );
  if (!row) return { error: "驗證連結無效或已過期，請重新寄送驗證信。" };
  await query("update users set email_verified_at = coalesce(email_verified_at, now()) where id = $1", [row.user_id]);
  if (row.status === "suspended") return { error: "這個帳號已被停用。" };
  await createSession(row.user_id);
  redirect(row.status === "pending" ? "/me?welcome=pending" : "/me?welcome=1");
}

// ─── 登入、登出 ────────────────────────────────────────

export async function login(_: FormState, fd: FormData): Promise<FormState> {
  const email = str(fd, "email").toLowerCase();
  const password = String(fd.get("password") ?? "");
  const next = safeNext(str(fd, "next"));
  if (!email || !password) return { error: "請輸入 email 和密碼。" };

  const user = await one<{
    id: string;
    password_hash: string;
    status: string;
    email_verified_at: Date | null;
    locked: boolean;
    failed_attempts: number;
  }>(
    `select id, password_hash, status, email_verified_at, failed_attempts,
            coalesce(locked_until > now(), false) as locked
       from users where email = $1`,
    [email],
  );
  if (user?.locked) return { error: `登入失敗次數過多，請 ${LOCK_MINUTES} 分鐘後再試。` };
  const ok = await verifyPassword(password, user?.password_hash);
  if (!user || !ok) {
    if (user) {
      await query(
        `update users set failed_attempts = failed_attempts + 1,
                locked_until = case when failed_attempts + 1 >= $2 then now() + make_interval(mins => $3) else locked_until end
          where id = $1`,
        [user.id, MAX_FAILED_LOGINS, LOCK_MINUTES],
      );
    }
    return { error: "email 或密碼不正確。" };
  }
  await query("update users set failed_attempts = 0, locked_until = null where id = $1", [user.id]);
  if (!user.email_verified_at) {
    redirect(`/signup/check-email?email=${encodeURIComponent(email)}&unverified=1`);
  }
  if (user.status === "suspended") return { error: "這個帳號已被停用。如有疑問，請來信 leftbank.psy@gmail.com。" };
  await createSession(user.id);
  redirect(next);
}

export async function logout() {
  await destroySession();
  redirect("/");
}

// ─── 忘記密碼 ──────────────────────────────────────────

export async function requestPasswordReset(_: FormState, fd: FormData): Promise<FormState> {
  const email = str(fd, "email").toLowerCase();
  const user = await one<{ id: string; name: string; recent: boolean }>(
    `select u.id, u.name,
            exists (select 1 from auth_tokens t where t.user_id = u.id and t.purpose = 'reset'
                    and t.created_at > now() - interval '60 seconds') as recent
       from users u where u.email = $1 and u.email_verified_at is not null and u.status <> 'suspended'`,
    [email],
  );
  if (user && !user.recent) {
    const token = await issueToken(user.id, "reset", 1);
    after(() => resetPasswordEmail(email, user.name, appUrl(`/reset-password?token=${token}`)));
  }
  return { ok: "如果這個 email 有註冊，我們已經寄出重設密碼的信，請在 1 小時內完成設定。" };
}

export async function resetPassword(_: FormState, fd: FormData): Promise<FormState> {
  const token = str(fd, "token");
  const password = String(fd.get("password") ?? "");
  if (password.length < PASSWORD_MIN) return { error: `密碼至少需要 ${PASSWORD_MIN} 個字元。` };
  const row = await one<{ user_id: string }>(
    `update auth_tokens set used_at = now()
      where token_hash = $1 and purpose = 'reset' and used_at is null and expires_at > now()
      returning user_id`,
    [sha256(token)],
  );
  if (!row) return { error: "連結無效或已過期，請重新申請重設密碼。" };
  await query("update users set password_hash = $2, failed_attempts = 0, locked_until = null where id = $1", [
    row.user_id,
    await hashPassword(password),
  ]);
  await destroyAllSessions(row.user_id);
  redirect("/login?reset=1");
}
