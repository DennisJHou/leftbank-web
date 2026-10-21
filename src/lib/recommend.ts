import "server-only";
import { query, type Db } from "./db";
import { cosine, mergeVector } from "./tags";
import { tagStoryWithAi } from "./ai";
import { storySections, type StoryAnswers } from "./story-questions";
import { keywordTags, profileTags, type Tag } from "./tagging";

export type { Tag };

/** 寫入某個來源的標籤（先清掉同來源的舊標籤） */
export async function saveUserTags(userId: string, source: "story" | "profile" | "cddq" | "ai", tags: Tag[], db?: Db) {
  const run = db ? db.query.bind(db) : query;
  await run("delete from user_tags where user_id = $1 and source = $2", [userId, source]);
  const merged = new Map<string, Tag>();
  for (const t of tags) {
    const k = `${t.dimension}:${t.label}`;
    if (!merged.has(k) || merged.get(k)!.weight < t.weight) merged.set(k, t);
  }
  for (const t of merged.values()) {
    await run(
      `insert into user_tags (user_id, tag_id, weight, source)
       select $1, id, $4, $5 from tag_vocab where dimension = $2 and label = $3`,
      [userId, t.dimension, t.label, Math.round(Math.min(1, Math.max(0, t.weight)) * 100) / 100, source],
    );
  }
}

// ─── 系友標籤 ──────────────────────────────────────────

export async function refreshProfileTags(userId: string) {
  const [p] = await query<{ title: string | null; field_category: string[] }>(
    "select title, field_category from alumni_profiles where user_id = $1",
    [userId],
  );
  await saveUserTags(userId, "profile", p ? profileTags(p) : []);
}

/** 系友發布或編輯故事時呼叫：優先用 AI 挑標籤，失敗時改用關鍵字規則 */
export async function refreshStoryTags(userId: string) {
  const [row] = await query<{
    tagline: string;
    answers: StoryAnswers;
    title: string | null;
    field_category: string[] | null;
    company: string | null;
  }>(
    `select s.tagline, s.answers, p.title, p.field_category, p.company
       from stories s left join alumni_profiles p on p.user_id = s.user_id
      where s.user_id = $1 and s.campaign_id is null`,
    [userId],
  );
  if (!row) {
    await saveUserTags(userId, "story", []);
    return;
  }
  const text = [
    `職稱：${row.title ?? "（未填）"}`,
    `領域：${(row.field_category ?? []).join("、") || "（未填）"}`,
    `一句話：${row.tagline}`,
    ...storySections(row.answers).map((s) => `【${s.title}】\n${s.body}`),
  ].join("\n\n");

  let tags: Tag[] | null = null;
  try {
    tags = await tagStoryWithAi(text, userId);
  } catch (e) {
    console.error("[recommend] AI 標籤失敗，改用關鍵字規則", e);
  }
  await saveUserTags(userId, "story", tags ?? keywordTags(text));
}

// ─── 配對 ──────────────────────────────────────────────

export type RecommendedAlumni = {
  id: string;
  name: string;
  title: string | null;
  photo_url: string | null;
  tagline: string | null;
  accept_question: boolean;
  accept_coffee: boolean;
  visibility: Record<string, string>;
  score: number;
};

/** 依學生標籤，推薦有開放線上提問或 Coffee Chat 的系友 */
export async function recommendAlumni(studentId: string, tags: Tag[], limit = 3): Promise<RecommendedAlumni[]> {
  const candidates = await query<Omit<RecommendedAlumni, "score"> & { updated_at: Date }>(
    `select u.id, u.name, p.title, p.photo_url, s.tagline, p.accept_question, p.accept_coffee, p.visibility,
            greatest(p.updated_at, coalesce(s.updated_at, p.updated_at)) as updated_at
       from alumni_profiles p
       join users u on u.id = p.user_id
       left join stories s on s.user_id = u.id and s.campaign_id is null and s.status = 'published'
      where u.status = 'active' and u.id <> $1
        and p.show_in_directory and (p.accept_question or p.accept_coffee)
        and (exists (select 1 from education e where e.user_id = u.id and e.grad_year is not null)
             or (u.role_teacher and u.teacher_verified))`,
    [studentId],
  );
  if (!candidates.length) return [];

  const tagRows = await query<{ user_id: string; dimension: string; label: string; weight: number }>(
    `select ut.user_id, tv.dimension, tv.label, ut.weight
       from user_tags ut join tag_vocab tv on tv.id = ut.tag_id
      where ut.user_id = any($1::uuid[]) and ut.source in ('story', 'profile')`,
    [`{${candidates.map((c) => c.id).join(",")}}`],
  );
  const byUser = new Map<string, typeof tagRows>();
  for (const r of tagRows) (byUser.get(r.user_id) ?? byUser.set(r.user_id, []).get(r.user_id)!).push(r);

  const student = mergeVector(tags);
  return candidates
    .map(({ updated_at, ...c }) => ({
      ...c,
      score: cosine(student, mergeVector(byUser.get(c.id) ?? [])),
      // 分數相同時，最近更新的系友優先
      recency: new Date(updated_at).getTime(),
    }))
    .sort((a, b) => b.score - a.score || b.recency - a.recency)
    .slice(0, limit)
    .map(({ recency: _r, ...c }) => c);
}
