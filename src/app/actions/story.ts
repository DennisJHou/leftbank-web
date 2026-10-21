"use server";

import { after } from "next/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { one, query } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { STORY_FREE, STORY_QUESTIONS, validateStory, type StoryAnswers } from "@/lib/story-questions";
import { refreshStoryTags } from "@/lib/recommend";
import type { FormState } from "./auth";

const ANSWER_MAX = 3000;

/** 送出即直接發布；每人一篇，之後持續編輯更新 */
export async function saveStory(_: FormState, fd: FormData): Promise<FormState> {
  const user = await getCurrentUser();
  if (!user) return { error: "請重新登入。" };
  if (user.status !== "active") return { error: "帳號審核通過後才能發布故事。" };
  if (!user.identity.canBeListed) return { error: "故事開放給系友與老師撰寫。" };

  const tagline = String(fd.get("tagline") ?? "").trim();
  const answers: StoryAnswers = {};
  for (const q of [...STORY_QUESTIONS, STORY_FREE]) {
    const v = String(fd.get(q.key) ?? "").trim();
    if (v.length > ANSWER_MAX) return { error: `每題請在 ${ANSWER_MAX} 字以內。` };
    if (v) answers[q.key] = v;
  }
  const err = validateStory(tagline, answers);
  if (err) return { error: err };

  const existing = await one<{ id: string }>("select id from stories where user_id = $1 and campaign_id is null", [user.id]);
  if (existing) {
    // 管理員下架的故事，作者編輯後維持下架狀態，由管理員決定是否恢復
    await query("update stories set tagline = $2, answers = $3::jsonb, updated_at = now() where id = $1", [
      existing.id,
      tagline,
      JSON.stringify(answers),
    ]);
  } else {
    await query("insert into stories (user_id, tagline, answers) values ($1, $2, $3::jsonb)", [
      user.id,
      tagline,
      JSON.stringify(answers),
    ]);
  }
  after(() => refreshStoryTags(user.id));
  revalidatePath("/");
  revalidatePath(`/alumni/${user.id}`);
  redirect("/me/story?saved=1");
}

export async function deleteStory(): Promise<FormState> {
  const user = await getCurrentUser();
  if (!user) return { error: "請重新登入。" };
  await query("delete from stories where user_id = $1 and campaign_id is null", [user.id]);
  after(() => refreshStoryTags(user.id));
  revalidatePath("/");
  redirect("/me/story?deleted=1");
}
