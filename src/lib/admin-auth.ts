import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { one, query } from "./db";
import { randomToken, safeEqual, sha256, verifyPassword } from "./crypto";
import { LOCK_MINUTES, MAX_FAILED_LOGINS } from "./auth";

/**
 * 後台帳號與前台完全分開。
 * 第一個超級管理員來自環境變數 SUPER_ADMIN_EMAIL / SUPER_ADMIN_PASSWORD，其他帳號在後台建立。
 */
const COOKIE = "lb_admin";
const SESSION_HOURS = 12;

export type Admin = { id: string; email: string; name: string; level: "super" | "admin"; fromEnv: boolean };

export function envSuperAdmin() {
  const email = process.env.SUPER_ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.SUPER_ADMIN_PASSWORD;
  return email && password ? { email, password } : null;
}

export async function adminLogin(emailRaw: string, password: string): Promise<{ ok: true } | { error: string }> {
  const email = emailRaw.trim().toLowerCase();
  const env = envSuperAdmin();
  const isEnv = env?.email === email;

  // 環境變數的超級管理員：確保資料表裡有對應的一列（用來記錄登入失敗與 session）
  if (isEnv) {
    await query(
      `insert into admin_accounts (email, name, level) values ($1, '超級管理員', 'super')
       on conflict (email) do update set level = 'super'`,
      [email],
    );
  }
  const acc = await one<{ id: string; password_hash: string | null; locked: boolean }>(
    "select id, password_hash, coalesce(locked_until > now(), false) as locked from admin_accounts where email = $1",
    [email],
  );
  if (acc?.locked) return { error: `登入失敗次數過多，帳號已鎖定 ${LOCK_MINUTES} 分鐘。` };

  const ok = isEnv ? safeEqual(password, env!.password) : await verifyPassword(password, acc?.password_hash);
  if (!acc || !ok) {
    if (acc) {
      await query(
        `update admin_accounts set failed_attempts = failed_attempts + 1,
                locked_until = case when failed_attempts + 1 >= $2 then now() + make_interval(mins => $3) else locked_until end
          where id = $1`,
        [acc.id, MAX_FAILED_LOGINS, LOCK_MINUTES],
      );
    }
    return { error: "帳號或密碼不正確。" };
  }

  await query("update admin_accounts set failed_attempts = 0, locked_until = null where id = $1", [acc.id]);
  const token = randomToken();
  const expires = new Date(Date.now() + SESSION_HOURS * 3600_000);
  await query("insert into admin_sessions (token_hash, admin_id, expires_at) values ($1, $2, $3)", [
    sha256(token),
    acc.id,
    expires.toISOString(),
  ]);
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/admin",
    expires,
  });
  return { ok: true };
}

export async function adminLogout() {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (token) await query("delete from admin_sessions where token_hash = $1", [sha256(token)]);
  jar.delete({ name: COOKIE, path: "/admin" });
}

export const getAdmin = cache(async (): Promise<Admin | null> => {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  const row = await one<{ id: string; email: string; name: string; level: "super" | "admin"; env_only: boolean }>(
    `select a.id, a.email, a.name, a.level, a.password_hash is null as env_only
       from admin_sessions s join admin_accounts a on a.id = s.admin_id
      where s.token_hash = $1 and s.expires_at > now()`,
    [sha256(token)],
  );
  if (!row) return null;
  const fromEnv = envSuperAdmin()?.email === row.email;
  // 環境變數的超級管理員被換掉之後，舊的 session 也不再有效
  if (row.env_only && !fromEnv) return null;
  return { id: row.id, email: row.email, name: row.name, level: row.level, fromEnv };
});

/** 每個後台頁面與動作都要呼叫（不能只靠 layout） */
export async function requireAdmin(level: "admin" | "super" = "admin"): Promise<Admin> {
  const admin = await getAdmin();
  if (!admin) redirect("/admin/login");
  if (level === "super" && admin.level !== "super") redirect("/admin?denied=1");
  return admin;
}
