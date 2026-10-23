import Link from "next/link";
import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { activeRequest, getPublicProfile, getPublishedStory, hasVoted } from "@/lib/queries";
import { storySections } from "@/lib/story-questions";
import { CONTACT_TYPE_LABEL, REQUEST_STATUS_LABEL, type ContactType, type RequestStatus } from "@/lib/constants";
import { NameCard } from "@/components/NameCard";
import { WASH } from "@/components/art/sketch";
import { ScrollFx } from "@/components/ScrollFx";
import { BackLink, EmptyState } from "@/components/ui";
import { VoteButton } from "./VoteButton";

const NUMERALS = ["一", "二", "三", "四", "五", "六", "七", "八", "九", "十"];
const SECTION_WASHES = [WASH.sage, WASH.ochre, WASH.clay, WASH.river];

export async function generateMetadata({ params }: PageProps<"/alumni/[id]">) {
  const { id } = await params;
  const p = await getPublicProfile(id, false);
  return { title: p ? p.name : "系友" };
}

export default async function AlumniProfilePage({ params, searchParams }: PageProps<"/alumni/[id]">) {
  const { id } = await params;
  const { sent } = await searchParams;
  const user = await getCurrentUser();
  const p = await getPublicProfile(id, Boolean(user));
  if (!p) notFound();

  const [story, pending, voted] = await Promise.all([
    getPublishedStory(id),
    user ? activeRequest(user.id, id) : null,
    user ? hasVoted(user.id, id) : false,
  ]);
  const isSelf = user?.id === id;
  const contactHref = (type: ContactType) => {
    const target = `/alumni/${id}/contact?type=${type}`;
    return user ? target : `/login?next=${encodeURIComponent(target)}`;
  };
  const canContact = p.acceptQuestion || p.acceptCoffee;
  const sections = story ? storySections(story.answers) : [];
  const subtitle = [p.title, p.company].filter(Boolean).join("，");

  return (
    <div className="paper-grid paper-page">
      <ScrollFx />
      <div className="container-page pt-10">
        <BackLink href="/alumni">系友園地</BackLink>

        <div className="mt-10 grid gap-12 md:grid-cols-[320px_minmax(0,1fr)] md:gap-20">
          {/* 左欄：基本資料與按鈕 */}
          <aside className="rise md:sticky md:top-28 md:self-start">
            <div className="relative aspect-square w-56 overflow-hidden ring-1 ring-hairline md:w-full">
              {p.photo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={p.photo} alt={p.name} className="h-full w-full object-cover" />
              ) : (
                <NameCard name={p.name} className="text-[2rem] md:text-[2.5rem]" />
              )}
              {p.isTeacher && <span className="seal absolute right-3 top-3 text-[0.8125rem]">老師</span>}
            </div>
            <h1 className="h-feature mt-8">{p.name}</h1>
            {subtitle && <p className="mt-2 text-body tracking-[0.04em] text-ash">{subtitle}</p>}
            {p.fields.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {p.fields.map((f) => (
                  <span key={f} className="tag-pill">{f}</span>
                ))}
              </div>
            )}
            {(p.classYear || p.education.length > 0) && (
              <ul className="mt-6 space-y-1 border-t border-hairline pt-5 text-meta text-ash">
                {p.education.length ? p.education.map((e) => <li key={e}>{e}</li>) : <li>{p.classYear}</li>}
              </ul>
            )}

            <div className="mt-8 space-y-3">
              {sent && <p className="notice notice-ok">已送出{CONTACT_TYPE_LABEL[sent as ContactType] ?? ""}，系友回應後會寫信通知你。</p>}
              {isSelf ? (
                <p className="notice">
                  這是你的公開頁面。<Link href="/me?tab=public" className="link">調整公開設定</Link>
                </p>
              ) : (
                <>
                  {canContact && pending && !sent && (
                    <p className="notice">
                      你送出的{CONTACT_TYPE_LABEL[pending.type as ContactType]}目前「{REQUEST_STATUS_LABEL[pending.status as RequestStatus]}」。同一位系友一次只能有一筆進行中的申請。
                    </p>
                  )}
                  {canContact && !pending && (
                    <>
                      {p.acceptQuestion && (
                        <Link href={contactHref("question")} className="btn-pill btn-pill-solid w-full">線上提問</Link>
                      )}
                      {p.acceptCoffee && (
                        <Link href={contactHref("coffee")} className={`btn-pill w-full ${p.acceptQuestion ? "" : "btn-pill-solid"}`}>
                          約一杯咖啡
                        </Link>
                      )}
                    </>
                  )}
                  {p.willingToTalk && (
                    <VoteButton alumniId={id} initialVoted={voted} loginHref={user ? undefined : `/login?next=${encodeURIComponent(`/alumni/${id}`)}`} />
                  )}
                </>
              )}
            </div>
          </aside>

          {/* 右欄：故事 */}
          <article id="story" className="min-w-0">
            <span className="eyebrow rise" style={{ "--delay": "120ms" } as React.CSSProperties}>#系友故事</span>
            <h2 className="h-feature rise mt-3" style={{ "--delay": "200ms" } as React.CSSProperties}>{p.name}的故事</h2>
            {story ? (
              <>
                <blockquote className="quote-kai rise mt-10 text-[clamp(1.25rem,1.1rem+0.6vw,1.625rem)]" style={{ "--delay": "280ms" } as React.CSSProperties}>
                  「{story.tagline}」
                </blockquote>
                <div className="mt-16 space-y-14">
                  {sections.map((s, i) => (
                    <section key={s.key} data-reveal>
                      <h3 className="flex items-center gap-4">
                        <span className="numeral h-10 w-10 text-[1.0625rem]" style={{ background: SECTION_WASHES[i % SECTION_WASHES.length] }} aria-hidden>
                          {NUMERALS[i] ?? i + 1}
                        </span>
                        <span className="h-item tracking-[0.12em]">{s.title}</span>
                      </h3>
                      <div className="prose-story prose-airy mt-5 text-body">
                        {s.body.split(/\n{2,}/).map((para, i) => (
                          <p key={i}>{para}</p>
                        ))}
                      </div>
                    </section>
                  ))}
                </div>
                <p className="mt-12 text-note text-ash">
                  最後更新：{new Date(story.updated_at).toLocaleDateString("zh-TW", { year: "numeric", month: "long", day: "numeric" })}
                </p>
              </>
            ) : (
              <div className="mt-8">
                <EmptyState title="尚未撰寫故事" />
              </div>
            )}
          </article>
        </div>
      </div>
    </div>
  );
}
