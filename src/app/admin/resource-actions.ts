"use server";

import { revalidatePath } from "next/cache";
import { pgArray, query } from "@/lib/db";
import { requireAdmin } from "@/lib/admin-auth";
import { SUBSCALE_ORDER } from "@/lib/cddq";
import { COMPONENTS } from "@/lib/agent/types";
import type { FormState } from "@/app/actions/auth";

const LEVELS = ["national", "university", "college", "department", "leftbank"];
const EVIDENCE = ["direct", "inferred", "preliminary"];

/** 新增或更新一筆資源（代號已存在就更新），儲存時查證日期更新為今天 */
export async function saveResource(_: FormState, fd: FormData): Promise<FormState> {
  await requireAdmin();
  const str = (k: string) => String(fd.get(k) ?? "").trim();
  const id = str("id").toLowerCase();
  if (!/^[a-z0-9-]{2,60}$/.test(id)) return { error: "代號只能用英文小寫、數字與 -。" };
  const title = str("title");
  const provider = str("provider");
  const url = str("url");
  const summary = str("summary");
  if (!title || !provider || !url || !summary) return { error: "名稱、提供單位、網址、說明都要填。" };
  if (!/^(https:\/\/|\/)/.test(url)) return { error: "網址要以 https:// 或 / 開頭。" };
  const level = str("level");
  const evidence = str("evidence");
  if (!LEVELS.includes(level) || !EVIDENCE.includes(evidence)) return { error: "層級或證據層級不正確。" };
  const subscales = fd.getAll("subscales").map(String).filter((s) => (SUBSCALE_ORDER as string[]).includes(s));
  const components = fd.getAll("components").map(String).filter((s) => (COMPONENTS as readonly string[]).includes(s));
  if (!subscales.length) return { error: "請至少勾選一個對應面向。" };
  await query(
    `insert into resources (id, title, provider, level, url, summary, subscales, components, evidence, needs_human, last_verified)
     values ($1, $2, $3, $4, $5, $6, $7::text[], $8::text[], $9, $10, current_date)
     on conflict (id) do update set title = $2, provider = $3, level = $4, url = $5, summary = $6, subscales = $7::text[],
       components = $8::text[], evidence = $9, needs_human = $10, last_verified = current_date, updated_at = now()`,
    [id, title, provider, level, url, summary, pgArray(subscales), pgArray(components), evidence, fd.get("needs_human") === "on"],
  );
  revalidatePath("/admin/resources");
  return { ok: "已儲存，查證日期更新為今天。" };
}

export async function toggleResource(id: string) {
  await requireAdmin();
  await query("update resources set active = not active, updated_at = now() where id = $1", [id]);
  revalidatePath("/admin/resources");
}

export async function markResourceVerified(id: string) {
  await requireAdmin();
  await query("update resources set last_verified = current_date, updated_at = now() where id = $1", [id]);
  revalidatePath("/admin/resources");
}
