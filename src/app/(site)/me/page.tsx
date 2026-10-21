import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { one, query } from "@/lib/db";
import { identityLabels } from "@/lib/identity";
import { CONTACT_TYPE_LABEL, REQUEST_STATUS_LABEL, type ContactType, type RequestStatus } from "@/lib/constants";
import { DEFAULT_VISIBILITY } from "@/lib/queries";
import { CATEGORIES, levelOf, LEVEL_LABEL, type CddqScores } from "@/lib/cddq";
import { EducationForm, NameForm, PasswordForm, PhotoForm, PublicProfileForm } from "./forms";

export const metadata = { title: "我的帳號" };

const TABS = [
  { key: "profile", label: "個人資料" },
  { key: "public", label: "公開設定" },
  { key: "records", label: "故事與紀錄" },
] as const;

type Tab = (typeof TABS)[number]["key"];

const fmt = (d: Date) => new Date(d).toLocaleDateString("zh-TW", { year: "numeric", month: "numeric", day: "numeric" });

export default async function MePage({ searchParams }: PageProps<"/me">) {
  const sp = await searchParams;
  const user = await requireUser("/me");
  const tab: Tab = TABS.some((t) => t.key === sp.tab) ? (sp.tab as Tab) : "profile";
  const labels = identityLabels(user.identity);

  return (
    <div className="container-page pt-10 md:pt-16">
      <p className="eyebrow">我的帳號</p>
      <h1 className="display mt-4 text-[38px] md:text-[52px]">{user.name}</h1>
      <div className="mt-3 flex flex-wrap items-center gap-2 text-[14px] text-stone">
        {labels.map((l) => (
          <span key={l} className="chip">{l}</span>
        ))}
        {user.identity.teacherPending && <span className="chip">老師身分審核中</span>}
        <span className="text-ash">{user.email}</span>
      </div>

      <div className="mt-6 max-w-2xl space-y-3">
        {sp.welcome === "1" && <p className="notice notice-ok">歡迎加入左岸計畫！你的 email 已完成驗證。</p>}
        {user.status === "pending" && (
          <p className="notice">
            你的帳號正在等待管理員審核（教師，或沒有填學號的系友需要審核）。審核通過後，我們會寄信通知你；在這之前，你可以先瀏覽系友園地與故事。
          </p>
        )}
        {sp.pending === "1" && user.status === "pending" && <p className="notice notice-error">這項功能需要帳號審核通過後才能使用。</p>}
      </div>

      <nav className="mt-10 flex gap-6 border-b border-hairline" aria-label="帳號分頁">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={`/me?tab=${t.key}`}
            aria-current={tab === t.key ? "page" : undefined}
            className={`-mb-px border-b-2 pb-3 text-[15px] ${tab === t.key ? "border-stone text-ink" : "border-transparent text-ash hover:text-stone"}`}
          >
            {t.label}
          </Link>
        ))}
      </nav>

      <div className="mt-10 max-w-2xl">
        {tab === "profile" && <ProfileTab user={user} />}
        {tab === "public" && <PublicTab userId={user.id} name={user.name} canBeListed={user.identity.canBeListed} />}
        {tab === "records" && <RecordsTab userId={user.id} canWrite={user.identity.canBeListed} />}
      </div>
    </div>
  );
}

function ProfileTab({ user }: { user: Awaited<ReturnType<typeof requireUser>> }) {
  return (
    <div className="space-y-14">
      <NameForm name={user.name} />
      <section>
        <h2 className="font-serif text-[22px] font-light">學歷紀錄</h2>
        <p className="mb-5 mt-1 text-[14px] text-ash">
          身分由學歷自動判斷：有「在學中」的學歷是學生，有已畢業的學歷是系友，兩者可以同時成立。
        </p>
        <EducationForm initial={user.education} allowStudying={!user.role_teacher} />
      </section>
      <section>
        <h2 className="mb-5 font-serif text-[22px] font-light">更改密碼</h2>
        <PasswordForm />
      </section>
    </div>
  );
}

async function PublicTab({ userId, name, canBeListed }: { userId: string; name: string; canBeListed: boolean }) {
  if (!canBeListed) {
    return (
      <div className="card p-8">
        <p className="display text-[22px]">公開頁面開放給系友與老師</p>
        <p className="mt-3 text-[15px] leading-relaxed text-stone">
          畢業之後，在「個人資料」補上畢業年，就可以出現在系友園地，讓學弟妹找到你。
        </p>
      </div>
    );
  }
  const p = await one<{
    title: string | null;
    company: string | null;
    field_category: string[];
    photo_url: string | null;
    show_in_directory: boolean;
    accept_question: boolean;
    accept_coffee: boolean;
    willing_to_talk: boolean;
    visibility: Record<string, string>;
  }>("select * from alumni_profiles where user_id = $1", [userId]);
  const votes = await one<{ n: number }>("select count(*)::int as n from talk_votes where alumni_id = $1", [userId]);

  return (
    <div className="space-y-12">
      <PhotoForm name={name} photo={p?.photo_url ?? null} />
      {p?.willing_to_talk && (
        <div className="flex items-center gap-5 rounded-card bg-gold-pale/40 p-6">
          <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-canvas font-serif text-[28px] text-stone">
            {votes?.n ?? 0}
          </span>
          <p className="text-[15px] leading-relaxed text-espresso">
            位同學想聽你回來分享。這個數字只有你和系上看得到，公開頁面不會顯示。
          </p>
        </div>
      )}
      <PublicProfileForm
        initial={{
          title: p?.title ?? "",
          company: p?.company ?? "",
          fields: p?.field_category ?? [],
          show: p?.show_in_directory ?? false,
          question: p?.accept_question ?? false,
          coffee: p?.accept_coffee ?? false,
          talk: p?.willing_to_talk ?? false,
          vis: { ...DEFAULT_VISIBILITY, ...(p?.visibility ?? {}) },
        }}
      />
      {p?.show_in_directory && (
        <Link href={`/alumni/${userId}`} className="link text-[15px]">看看我的公開頁面 →</Link>
      )}
    </div>
  );
}

async function RecordsTab({ userId, canWrite }: { userId: string; canWrite: boolean }) {
  const [story, sessions, sent, received] = await Promise.all([
    one<{ status: string; updated_at: Date; tagline: string }>(
      "select status, updated_at, tagline from stories where user_id = $1 and campaign_id is null",
      [userId],
    ),
    query<{ id: string; kind: string; status: string; created_at: Date; scores: CddqScores | null }>(
      "select id, kind, status, created_at, scores from compass_sessions where user_id = $1 order by created_at desc",
      [userId],
    ),
    query<{ id: string; type: ContactType; status: RequestStatus; created_at: Date; name: string; to_user: string }>(
      `select r.id, r.type, r.status, r.created_at, u.name, r.to_user
         from contact_requests r join users u on u.id = r.to_user
        where r.from_user = $1 order by r.created_at desc`,
      [userId],
    ),
    query<{ id: string; type: ContactType; status: RequestStatus; created_at: Date; name: string; token: string }>(
      `select r.id, r.type, r.status, r.created_at, u.name, r.token
         from contact_requests r join users u on u.id = r.from_user
        where r.to_user = $1 order by r.created_at desc`,
      [userId],
    ),
  ]);

  return (
    <div className="space-y-14">
      <section>
        <h2 className="font-serif text-[22px] font-light">我的故事</h2>
        {canWrite ? (
          <div className="card mt-4 flex flex-col gap-4 p-6 md:flex-row md:items-center md:justify-between">
            {story ? (
              <div>
                <p className="font-serif text-[18px]">「{story.tagline}」</p>
                <p className="mt-1 text-[13px] text-ash">
                  {story.status === "hidden" ? "已被管理員暫時下架" : "已發布"} · 更新於 {fmt(story.updated_at)}
                </p>
              </div>
            ) : (
              <p className="text-[15px] text-stone">你還沒有寫下故事。學弟妹很想聽聽你走過的路。</p>
            )}
            <Link href="/me/story" className="btn btn-outline btn-sm shrink-0">{story ? "編輯故事" : "開始寫"}</Link>
          </div>
        ) : (
          <p className="mt-3 text-[15px] text-ash">故事開放給系友與老師撰寫。</p>
        )}
      </section>

      <section>
        <h2 className="font-serif text-[22px] font-light">我的職涯羅盤</h2>
        {sessions.length ? (
          <ul className="mt-4 divide-y divide-hairline border-y border-hairline">
            {sessions.map((s) => (
              <li key={s.id}>
                <Link
                  href={s.status === "completed" ? `/compass/result/${s.id}` : "/compass/ai"}
                  className="flex items-center justify-between gap-4 py-4 hover:bg-surface/60"
                >
                  <span>
                    <span className="block text-[15px]">{s.kind === "ai" ? "AI 生涯對談" : "生涯決策困難量表"}</span>
                    <span className="text-[13px] text-ash">
                      {fmt(s.created_at)}
                      {s.status !== "completed" && " · 進行中"}
                      {s.scores &&
                        ` · ${(Object.keys(CATEGORIES) as (keyof typeof CATEGORIES)[])
                          .map((k) => `${CATEGORIES[k].label}${LEVEL_LABEL[levelOf(s.scores!.categories[k])]}`)
                          .join("、")}`}
                    </span>
                  </span>
                  <span aria-hidden className="text-ash">→</span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-[15px] text-ash">
            還沒有使用過。<Link href="/compass" className="link">試試職涯羅盤</Link>
          </p>
        )}
      </section>

      <section>
        <h2 className="font-serif text-[22px] font-light">我的提問紀錄</h2>
        {sent.length ? (
          <ul className="mt-4 divide-y divide-hairline border-y border-hairline">
            {sent.map((r) => (
              <li key={r.id} className="flex items-center justify-between gap-4 py-4">
                <span>
                  <Link href={`/alumni/${r.to_user}`} className="text-[15px] hover:underline">{r.name}</Link>
                  <span className="block text-[13px] text-ash">{CONTACT_TYPE_LABEL[r.type]} · {fmt(r.created_at)}</span>
                </span>
                <StatusChip status={r.status} />
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-[15px] text-ash">
            還沒有聯絡過系友。<Link href="/alumni" className="link">逛逛系友園地</Link>
          </p>
        )}
      </section>

      {received.length > 0 && (
        <section>
          <h2 className="font-serif text-[22px] font-light">收到的邀請</h2>
          <ul className="mt-4 divide-y divide-hairline border-y border-hairline">
            {received.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center justify-between gap-3 py-4">
                <span>
                  <span className="text-[15px]">{r.name}</span>
                  <span className="block text-[13px] text-ash">{CONTACT_TYPE_LABEL[r.type]} · {fmt(r.created_at)}</span>
                </span>
                {r.status === "pending" ? (
                  <span className="flex gap-2">
                    <Link href={`/r/${r.token}?action=accept`} className="btn btn-stone btn-sm">我會聯絡他</Link>
                    <Link href={`/r/${r.token}?action=decline`} className="btn btn-outline btn-sm">婉拒</Link>
                  </span>
                ) : r.status === "accepted" ? (
                  <Link href={`/r/${r.token}?action=complete`} className="btn btn-outline btn-sm">標示為已完成</Link>
                ) : (
                  <StatusChip status={r.status} />
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function StatusChip({ status }: { status: RequestStatus }) {
  const tone =
    status === "completed" || status === "accepted"
      ? "bg-sage-pale text-forest"
      : status === "pending"
        ? "bg-gold-pale/60 text-gold-deep"
        : "bg-surface-grey text-ash";
  return <span className={`chip ${tone}`}>{REQUEST_STATUS_LABEL[status]}</span>;
}
