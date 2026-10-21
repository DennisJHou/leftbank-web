"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { one, query } from "@/lib/db";
import { adminLogin, adminLogout, envSuperAdmin, requireAdmin } from "@/lib/admin-auth";
import { hashPassword } from "@/lib/crypto";
import { destroyAllSessions } from "@/lib/auth";
import { accountApprovedEmail } from "@/lib/mail";
import { runDailyJobs } from "@/lib/cron";
import { deleteImage, InvalidImageError, saveImage, validateImage } from "@/lib/storage";
import { DEFAULT_SITE_CONTENT } from "@/lib/site-content-defaults";
import { PASSWORD_MIN } from "@/lib/constants";
import type { FormState } from "@/app/actions/auth";

export async function adminLoginAction(_: FormState, fd: FormData): Promise<FormState> {
  const res = await adminLogin(String(fd.get("email") ?? ""), String(fd.get("password") ?? ""));
  if ("error" in res) return { error: res.error };
  redirect("/admin");
}

export async function adminLogoutAction() {
  await adminLogout();
  redirect("/admin/login");
}

// ─── 帳號 ──────────────────────────────────────────────

/** 審核通過：帳號啟用，老師身分一併核准，並寄信通知 */
export async function approveUser(userId: string) {
  await requireAdmin();
  const u = await one<{ name: string; email: string; status: string; role_teacher: boolean; teacher_verified: boolean }>(
    "select name, email, status, role_teacher, teacher_verified from users where id = $1",
    [userId],
  );
  if (!u) return;
  await query(
    "update users set status = 'active', teacher_verified = (role_teacher or teacher_verified) where id = $1",
    [userId],
  );
  if (u.status === "pending" || (u.role_teacher && !u.teacher_verified)) await accountApprovedEmail(u.email, u.name);
  revalidatePath("/admin/accounts");
}

export async function suspendUser(userId: string) {
  await requireAdmin();
  await query("update users set status = 'suspended' where id = $1", [userId]);
  await destroyAllSessions(userId);
  revalidatePath("/admin/accounts");
}

export async function restoreUser(userId: string) {
  await requireAdmin();
  await query("update users set status = 'active' where id = $1 and status = 'suspended'", [userId]);
  revalidatePath("/admin/accounts");
}

// ─── 故事 ──────────────────────────────────────────────

export async function setStoryStatus(storyId: string, status: "published" | "hidden") {
  await requireAdmin();
  const row = await one<{ user_id: string }>("update stories set status = $2 where id = $1 returning user_id", [storyId, status]);
  revalidatePath("/admin/stories");
  revalidatePath("/");
  if (row) revalidatePath(`/alumni/${row.user_id}`);
}

// ─── 提問與咖啡 ────────────────────────────────────────

export async function runSweepNow(): Promise<FormState> {
  await requireAdmin();
  const r = await runDailyJobs();
  revalidatePath("/admin/requests");
  return { ok: `已檢查：${r.overdue} 筆改為逾期、寄出 ${r.followups} 封完成確認信。` };
}

// ─── 首頁內容 ──────────────────────────────────────────

const TEXT_KEYS = Object.keys(DEFAULT_SITE_CONTENT).filter((k) => k !== "hero.image");

export async function saveSiteContent(_: FormState, fd: FormData): Promise<FormState> {
  await requireAdmin();
  for (const key of TEXT_KEYS) {
    const v = fd.get(key);
    if (v == null) continue;
    const value = String(v).replace(/\r\n/g, "\n").trim().slice(0, 4000);
    await query(
      `insert into site_content (key, value, updated_at) values ($1, $2, now())
       on conflict (key) do update set value = excluded.value, updated_at = now()`,
      [key, value],
    );
  }
  revalidatePath("/");
  return { ok: "已儲存，首頁已更新。" };
}

export async function uploadHeroImage(_: FormState, fd: FormData): Promise<FormState> {
  await requireAdmin();
  const file = fd.get("image") as File | null;
  const err = validateImage(file);
  if (err) return { error: err };
  let url: string;
  try {
    url = await saveImage(file!, "hero");
  } catch (e) {
    if (e instanceof InvalidImageError) return { error: e.message };
    throw e;
  }
  const old = await one<{ value: string }>("select value from site_content where key = 'hero.image'");
  await query(
    `insert into site_content (key, value, updated_at) values ('hero.image', $1, now())
     on conflict (key) do update set value = excluded.value, updated_at = now()`,
    [url],
  );
  await deleteImage(old?.value);
  revalidatePath("/");
  revalidatePath("/admin/content");
  return { ok: "主視覺已更新。" };
}

export async function removeHeroImage(): Promise<FormState> {
  await requireAdmin();
  const old = await one<{ value: string }>("select value from site_content where key = 'hero.image'");
  await query("update site_content set value = '', updated_at = now() where key = 'hero.image'");
  await deleteImage(old?.value);
  revalidatePath("/");
  revalidatePath("/admin/content");
  return { ok: "已改回預設插畫。" };
}

// ─── 後台帳號（僅限超級管理員） ────────────────────────

export async function createAdminAccount(_: FormState, fd: FormData): Promise<FormState> {
  const me = await requireAdmin("super");
  const email = String(fd.get("email") ?? "").trim().toLowerCase();
  const name = String(fd.get("name") ?? "").trim().slice(0, 40);
  const password = String(fd.get("password") ?? "");
  const level = fd.get("level") === "super" ? "super" : "admin";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: "請填寫正確的 email。" };
  if (password.length < 12) return { error: "後台密碼至少 12 個字元。" };
  if (envSuperAdmin()?.email === email) return { error: "這個 email 是環境變數設定的超級管理員。" };
  if (await one("select 1 from admin_accounts where email = $1", [email])) return { error: "這個 email 已經是後台帳號。" };
  await query(
    "insert into admin_accounts (email, name, password_hash, level, created_by) values ($1, $2, $3, $4, $5)",
    [email, name || email, await hashPassword(password), level, me.id],
  );
  revalidatePath("/admin/admins");
  return { ok: `已建立${level === "super" ? "超級管理員" : "管理員"}帳號 ${email}。請用安全的方式把密碼交給對方。` };
}

export async function deleteAdminAccount(id: string) {
  const me = await requireAdmin("super");
  if (id === me.id) return;
  const target = await one<{ email: string }>("select email from admin_accounts where id = $1", [id]);
  if (!target || envSuperAdmin()?.email === target.email) return;
  await query("delete from admin_accounts where id = $1", [id]);
  revalidatePath("/admin/admins");
}

export async function unlockAdminAccount(id: string) {
  await requireAdmin("super");
  await query("update admin_accounts set failed_attempts = 0, locked_until = null where id = $1", [id]);
  revalidatePath("/admin/admins");
}

export async function resetAdminPassword(_: FormState, fd: FormData): Promise<FormState> {
  await requireAdmin("super");
  const id = String(fd.get("id") ?? "");
  const password = String(fd.get("password") ?? "");
  if (password.length < Math.max(12, PASSWORD_MIN)) return { error: "後台密碼至少 12 個字元。" };
  await query("update admin_accounts set password_hash = $2, failed_attempts = 0, locked_until = null where id = $1 and password_hash is not null", [
    id,
    await hashPassword(password),
  ]);
  await query("delete from admin_sessions where admin_id = $1", [id]);
  revalidatePath("/admin/admins");
  return { ok: "已重設密碼，該帳號的登入已全部登出。" };
}
