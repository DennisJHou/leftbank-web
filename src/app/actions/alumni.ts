"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { one, pgArray, query } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { randomToken } from "@/lib/crypto";
import { activeRequest, getPublicProfile } from "@/lib/queries";
import { newRequestEmail, requestSentEmail } from "@/lib/mail";
import { INTRO_MAX, INTRO_MIN, QUESTION_MAX, type ContactType } from "@/lib/constants";
import type { FormState } from "./auth";

/** 「想聽他回來分享 +1」：每人對每位系友一票，可以收回 */
export async function toggleTalkVote(alumniId: string): Promise<{ voted: boolean } | { error: string }> {
  const user = await getCurrentUser();
  if (!user) return { error: "login" };
  if (user.status !== "active") return { error: "帳號審核通過後才能投票。" };
  if (user.id === alumniId) return { error: "不能投給自己。" };
  const target = await one<{ willing_to_talk: boolean }>(
    "select willing_to_talk from alumni_profiles where user_id = $1",
    [alumniId],
  );
  if (!target?.willing_to_talk) return { error: "這位系友目前沒有開放回校分享。" };

  const removed = await query("delete from talk_votes where user_id = $1 and alumni_id = $2 returning 1", [
    user.id,
    alumniId,
  ]);
  if (removed.length) return { voted: false };
  await query("insert into talk_votes (user_id, alumni_id) values ($1, $2) on conflict do nothing", [user.id, alumniId]);
  return { voted: true };
}


export async function sendContactRequest(_: FormState, fd: FormData): Promise<FormState> {
  const user = await getCurrentUser();
  if (!user) return { error: "請先登入。" };
  if (user.status !== "active") return { error: "帳號審核通過後才能聯絡系友。" };

  const alumniId = String(fd.get("alumni_id") ?? "");
  const type = String(fd.get("type") ?? "") as ContactType;
  if (type !== "question" && type !== "coffee") return { error: "請選擇聯絡方式。" };
  if (alumniId === user.id) return { error: "不能聯絡自己。" };

  const alumni = await getPublicProfile(alumniId, true);
  if (!alumni) return { error: "找不到這位系友。" };
  if (type === "question" ? !alumni.acceptQuestion : !alumni.acceptCoffee) {
    return { error: "這位系友目前沒有開放這項服務。" };
  }
  if (await activeRequest(user.id, alumniId)) {
    return { error: "你對這位系友已經有一筆進行中的申請，請等他回覆後再提出。" };
  }

  const intro = String(fd.get("intro") ?? "").trim();
  const questions = fd
    .getAll("question")
    .map((q) => String(q).trim())
    .filter(Boolean);
  if (intro.length < INTRO_MIN) return { error: `自我介紹請至少寫 ${INTRO_MIN} 字，讓系友認識你。` };
  if (intro.length > INTRO_MAX) return { error: `自我介紹請在 ${INTRO_MAX} 字以內。` };
  if (questions.some((q) => q.length > QUESTION_MAX)) return { error: `每個問題請在 ${QUESTION_MAX} 字以內。` };

  let mode: string | null = null;
  let availability: string | null = null;
  if (type === "question") {
    if (questions.length < 1 || questions.length > 3) return { error: "請寫下 1–3 個問題。" };
  } else {
    if (questions.length !== 3) return { error: "約咖啡請準備 3 個具體的問題。" };
    mode = String(fd.get("mode") ?? "");
    if (!["in_person", "online", "either"].includes(mode)) return { error: "請選擇見面的方式。" };
    availability = String(fd.get("availability") ?? "").trim().slice(0, 300);
    if (!availability) return { error: "請寫下你方便的時段。" };
    if (fd.get("gift") !== "on") return { error: "請確認你了解見面時的小小致意。" };
  }

  const recipient = await one<{ email: string }>("select email from users where id = $1", [alumniId]);
  const token = randomToken();
  await query(
    `insert into contact_requests (from_user, to_user, type, intro, questions, mode, availability, token)
     values ($1, $2, $3, $4, $5::text[], $6, $7, $8)`,
    [user.id, alumniId, type, intro, pgArray(questions), mode, availability, token],
  );

  const mail = {
    type,
    studentName: user.name,
    studentEmail: user.email,
    alumniName: alumni.name,
    alumniEmail: recipient!.email,
    intro,
    questions,
    mode,
    availability,
    token,
  };
  await newRequestEmail(mail);
  await requestSentEmail(mail);
  revalidatePath(`/alumni/${alumniId}`);
  redirect(`/alumni/${alumniId}?sent=${type}`);
}
