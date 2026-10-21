"use server";

import { after } from "next/server";
import { revalidatePath } from "next/cache";
import { one, pgArray, query, tx } from "@/lib/db";
import { getCurrentUser, requireUser } from "@/lib/auth";
import { hashPassword, verifyPassword } from "@/lib/crypto";
import { FIELD_CATEGORIES, PASSWORD_MIN } from "@/lib/constants";
import { parseEducationForm, validateEducationForIdentity } from "@/lib/education-form";
import { deleteImage, saveImage, validateImage } from "@/lib/storage";
import { refreshProfileTags } from "@/lib/recommend";
import type { FormState } from "./auth";

export async function updateName(_: FormState, fd: FormData): Promise<FormState> {
  const user = await requireUser("/me");
  const name = String(fd.get("name") ?? "").trim();
  if (!name || name.length > 40) return { error: "姓名請填 1–40 字。" };
  await query("update users set name = $2 where id = $1", [user.id, name]);
  revalidatePath("/", "layout");
  return { ok: "已更新姓名。" };
}

export async function changePassword(_: FormState, fd: FormData): Promise<FormState> {
  const user = await requireUser("/me");
  const current = String(fd.get("current") ?? "");
  const next = String(fd.get("next") ?? "");
  const row = await one<{ password_hash: string }>("select password_hash from users where id = $1", [user.id]);
  if (!(await verifyPassword(current, row?.password_hash))) return { error: "目前的密碼不正確。" };
  if (next.length < PASSWORD_MIN) return { error: `新密碼至少需要 ${PASSWORD_MIN} 個字元。` };
  await query("update users set password_hash = $2 where id = $1", [user.id, await hashPassword(next)]);
  return { ok: "密碼已更新。" };
}

export async function updateEducation(_: FormState, fd: FormData): Promise<FormState> {
  const user = await requireUser("/me");
  const parsed = parseEducationForm(fd);
  if ("error" in parsed) return { error: parsed.error };
  const rows = parsed.rows;
  if (!user.role_teacher && rows.length === 0) return { error: "學生與系友至少要有一筆學歷。" };
  const identity = user.role_teacher ? "teacher" : rows.some((e) => e.grad_year == null) ? "student" : "alumni";
  const err = validateEducationForIdentity(identity, rows);
  if (err) return { error: err };

  await tx(async (t) => {
    await t.query("delete from education where user_id = $1", [user.id]);
    for (const e of rows) {
      await t.query(
        "insert into education (user_id, degree, student_no, entry_year, grad_year) values ($1, $2, $3, $4, $5)",
        [user.id, e.degree, e.student_no, e.entry_year, e.grad_year],
      );
    }
  });
  revalidatePath("/me");
  return { ok: "已更新學歷。你的身分會依照學歷自動判斷。" };
}

const VIS_PUBLIC = ["photo", "title", "field", "company"] as const;
const VIS_MEMBERS = ["class_year", "education"] as const;

export async function updatePublicProfile(_: FormState, fd: FormData): Promise<FormState> {
  const user = await getCurrentUser();
  if (!user) return { error: "請重新登入。" };
  if (!user.identity.canBeListed) return { error: "系友或審核通過的老師才能設定公開頁面。" };

  const title = String(fd.get("title") ?? "").trim().slice(0, 60) || null;
  const company = String(fd.get("company") ?? "").trim().slice(0, 60) || null;
  const fields = fd
    .getAll("field_category")
    .map(String)
    .filter((f): f is (typeof FIELD_CATEGORIES)[number] => (FIELD_CATEGORIES as readonly string[]).includes(f));
  if (fields.length > 3) return { error: "領域最多選 3 個。" };

  const show = fd.get("show_in_directory") === "on";
  // 總開關關閉時，下面三項一律關閉
  const question = show && fd.get("accept_question") === "on";
  const coffee = show && fd.get("accept_coffee") === "on";
  const talk = show && fd.get("willing_to_talk") === "on";
  if (show && !title && !fields.length) return { error: "出現在系友園地前，請至少填寫職稱或選一個領域。" };

  const visibility: Record<string, string> = {};
  for (const k of VIS_PUBLIC) visibility[k] = fd.get(`vis_${k}`) === "hidden" ? "hidden" : "public";
  for (const k of VIS_MEMBERS) visibility[k] = fd.get(`vis_${k}`) === "hidden" ? "hidden" : "members";

  await query(
    `insert into alumni_profiles (user_id, title, field_category, company, show_in_directory, accept_question, accept_coffee, willing_to_talk, visibility, updated_at)
     values ($1, $2, $3::text[], $4, $5, $6, $7, $8, $9::jsonb, now())
     on conflict (user_id) do update set
       title = excluded.title, field_category = excluded.field_category, company = excluded.company,
       show_in_directory = excluded.show_in_directory, accept_question = excluded.accept_question,
       accept_coffee = excluded.accept_coffee, willing_to_talk = excluded.willing_to_talk,
       visibility = excluded.visibility, updated_at = now()`,
    [user.id, title, pgArray(fields), company, show, question, coffee, talk, JSON.stringify(visibility)],
  );
  after(() => refreshProfileTags(user.id));
  revalidatePath("/me");
  revalidatePath("/alumni");
  return { ok: show ? "已儲存。你的頁面已出現在系友園地。" : "已儲存。你目前沒有出現在系友園地。" };
}

export async function uploadPhoto(_: FormState, fd: FormData): Promise<FormState> {
  const user = await getCurrentUser();
  if (!user) return { error: "請重新登入。" };
  if (!user.identity.canBeListed) return { error: "系友或審核通過的老師才能上傳照片。" };
  const file = fd.get("photo") as File | null;
  const err = validateImage(file);
  if (err) return { error: err };
  const url = await saveImage(file!, "photos");
  const old = await one<{ photo_url: string | null }>("select photo_url from alumni_profiles where user_id = $1", [user.id]);
  await query(
    `insert into alumni_profiles (user_id, photo_url) values ($1, $2)
     on conflict (user_id) do update set photo_url = excluded.photo_url, updated_at = now()`,
    [user.id, url],
  );
  await deleteImage(old?.photo_url);
  revalidatePath("/", "layout");
  return { ok: "照片已更新。" };
}

export async function removePhoto(): Promise<FormState> {
  const user = await getCurrentUser();
  if (!user) return { error: "請重新登入。" };
  const old = await one<{ photo_url: string | null }>("select photo_url from alumni_profiles where user_id = $1", [user.id]);
  await query("update alumni_profiles set photo_url = null, updated_at = now() where user_id = $1", [user.id]);
  await deleteImage(old?.photo_url);
  revalidatePath("/", "layout");
  return { ok: "已移除照片。" };
}
