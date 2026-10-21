import "server-only";
import { one, query, pgArray } from "./db";
import { DEFAULT_SITE_CONTENT } from "./site-content-defaults";
import { classYearLabel, educationLine, sortEducation, type Education } from "./identity";
import type { StoryAnswers } from "./story-questions";
import { ACCEPTED_ACTIVE_DAYS } from "./constants";

export async function getSiteContent(): Promise<Record<string, string>> {
  const rows = await query<{ key: string; value: string }>("select key, value from site_content");
  return { ...DEFAULT_SITE_CONTENT, ...Object.fromEntries(rows.map((r) => [r.key, r.value])) };
}

/** 能出現在系友園地的人：帳號啟用、打開總開關，而且是系友或審核通過的老師 */
export const LISTABLE_SQL = `u.status = 'active' and p.show_in_directory and (
  exists (select 1 from education e where e.user_id = u.id and e.grad_year is not null)
  or (u.role_teacher and u.teacher_verified))`;

export type Visibility = {
  photo: "public" | "hidden";
  title: "public" | "hidden";
  field: "public" | "hidden";
  company: "public" | "hidden";
  class_year: "members" | "hidden";
  education: "members" | "hidden";
};

export const DEFAULT_VISIBILITY: Visibility = {
  photo: "public",
  title: "public",
  field: "public",
  company: "public",
  class_year: "members",
  education: "members",
};

type ProfileRow = {
  id: string;
  name: string;
  role_teacher: boolean;
  teacher_verified: boolean;
  title: string | null;
  field_category: string[];
  company: string | null;
  photo_url: string | null;
  accept_question: boolean;
  accept_coffee: boolean;
  willing_to_talk: boolean;
  visibility: Partial<Visibility>;
};

export type PublicProfile = {
  id: string;
  name: string;
  isTeacher: boolean;
  isAlumni: boolean;
  photo: string | null;
  title: string | null;
  fields: string[];
  company: string | null;
  classYear: string | null;
  education: string[];
  acceptQuestion: boolean;
  acceptCoffee: boolean;
  willingToTalk: boolean;
};

/** 依系友的公開設定，決定訪客／登入者能看到哪些欄位（姓名一律公開） */
function applyVisibility(row: ProfileRow, education: Education[], loggedIn: boolean): PublicProfile {
  const v = { ...DEFAULT_VISIBILITY, ...row.visibility };
  return {
    id: row.id,
    name: row.name,
    isTeacher: row.role_teacher && row.teacher_verified,
    isAlumni: education.some((e) => e.grad_year != null),
    photo: v.photo === "public" ? row.photo_url : null,
    title: v.title === "public" ? row.title : null,
    fields: v.field === "public" ? row.field_category : [],
    company: v.company === "public" ? row.company : null,
    classYear: loggedIn && v.class_year === "members" ? classYearLabel(education) : null,
    education: loggedIn && v.education === "members" ? sortEducation(education).map(educationLine) : [],
    acceptQuestion: row.accept_question,
    acceptCoffee: row.accept_coffee,
    willingToTalk: row.willing_to_talk,
  };
}

const PROFILE_COLUMNS = `u.id, u.name, u.role_teacher, u.teacher_verified,
  p.title, p.field_category, p.company, p.photo_url, p.accept_question, p.accept_coffee, p.willing_to_talk, p.visibility`;

async function educationFor(ids: string[]) {
  if (!ids.length) return new Map<string, Education[]>();
  const rows = await query<Education & { user_id: string }>(
    "select user_id, id, degree, student_no, entry_year, grad_year from education where user_id = any($1::uuid[])",
    [`{${ids.join(",")}}`],
  );
  const map = new Map<string, Education[]>();
  for (const r of rows) (map.get(r.user_id) ?? map.set(r.user_id, []).get(r.user_id)!).push(r);
  return map;
}

// ─── 首頁故事卡 ────────────────────────────────────────

export type StoryCardData = {
  userId: string;
  name: string;
  title: string | null;
  photo: string | null;
  tagline: string;
};

export async function latestStories(limit = 3): Promise<StoryCardData[]> {
  const rows = await query<ProfileRow & { tagline: string }>(
    `select ${PROFILE_COLUMNS}, s.tagline
       from stories s
       join users u on u.id = s.user_id
       join alumni_profiles p on p.user_id = u.id
      where s.status = 'published' and s.campaign_id is null and ${LISTABLE_SQL}
      order by s.updated_at desc
      limit $1`,
    [limit],
  );
  return rows.map((r) => {
    const v = { ...DEFAULT_VISIBILITY, ...r.visibility };
    return {
      userId: r.id,
      name: r.name,
      title: v.title === "public" ? r.title : null,
      photo: v.photo === "public" ? r.photo_url : null,
      tagline: r.tagline,
    };
  });
}

// ─── 系友園地 ──────────────────────────────────────────

export type DirectoryFilters = {
  q?: string;
  field?: string;
  question?: boolean;
  coffee?: boolean;
  talk?: boolean;
};

/** 系友園地目前有幾位（不含篩選），用來決定是否顯示「資料建置中」 */
export async function countDirectory() {
  const row = await one<{ n: number }>(
    `select count(*)::int as n from alumni_profiles p join users u on u.id = p.user_id where ${LISTABLE_SQL}`,
  );
  return row?.n ?? 0;
}

export async function listDirectory(f: DirectoryFilters, loggedIn: boolean) {
  const where: string[] = [LISTABLE_SQL];
  const params: unknown[] = [];
  if (f.q) {
    params.push(`%${f.q.replace(/[%_\\]/g, (c) => "\\" + c)}%`);
    // 搜尋職稱時只比對公開的職稱
    where.push(`(u.name ilike $${params.length} or (p.title ilike $${params.length} and coalesce(p.visibility->>'title', 'public') = 'public'))`);
  }
  if (f.field) {
    params.push(pgArray([f.field]));
    where.push(`(p.field_category && $${params.length}::text[] and coalesce(p.visibility->>'field', 'public') = 'public')`);
  }
  if (f.question) where.push("p.accept_question");
  if (f.coffee) where.push("p.accept_coffee");
  if (f.talk) where.push("p.willing_to_talk");

  const rows = await query<ProfileRow & { has_story: boolean }>(
    `select ${PROFILE_COLUMNS},
            exists (select 1 from stories s where s.user_id = u.id and s.status = 'published') as has_story
       from alumni_profiles p join users u on u.id = p.user_id
      where ${where.join(" and ")}
      order by has_story desc, p.updated_at desc`,
    params,
  );
  const edu = await educationFor(rows.map((r) => r.id));
  return rows.map((r) => ({ ...applyVisibility(r, edu.get(r.id) ?? [], loggedIn), hasStory: r.has_story }));
}

// ─── 系友個人頁 ────────────────────────────────────────

export async function getPublicProfile(id: string, loggedIn: boolean) {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const row = await one<ProfileRow>(
    `select ${PROFILE_COLUMNS} from alumni_profiles p join users u on u.id = p.user_id where u.id = $1 and ${LISTABLE_SQL}`,
    [id],
  );
  if (!row) return null;
  const edu = await educationFor([id]);
  return applyVisibility(row, edu.get(id) ?? [], loggedIn);
}

export async function getPublishedStory(userId: string) {
  return one<{ id: string; tagline: string; answers: StoryAnswers; updated_at: Date }>(
    "select id, tagline, answers, updated_at from stories where user_id = $1 and campaign_id is null and status = 'published'",
    [userId],
  );
}

/** 學生對某位系友是否已有進行中的申請（待回應，或已接受且還在有效期內） */
export async function activeRequest(fromUser: string, toUser: string) {
  return one<{ id: string; type: string; status: string }>(
    `select id, type, status from contact_requests
      where from_user = $1 and to_user = $2
        and (status = 'pending' or (status = 'accepted' and responded_at > now() - make_interval(days => $3)))
      order by created_at desc limit 1`,
    [fromUser, toUser, ACCEPTED_ACTIVE_DAYS],
  );
}

export async function hasVoted(userId: string, alumniId: string) {
  return Boolean(await one("select 1 from talk_votes where user_id = $1 and alumni_id = $2", [userId, alumniId]));
}
