import Link from "next/link";
import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { activeRequest, getPublicProfile, getPublishedStory, hasVoted } from "@/lib/queries";
import { storySections } from "@/lib/story-questions";
import { CONTACT_TYPE_LABEL, REQUEST_STATUS_LABEL, type ContactType, type RequestStatus } from "@/lib/constants";
import { InitialsPanel } from "@/components/Avatar";
import { BackLink, EmptyState } from "@/components/ui";
import { VoteButton } from "./VoteButton";

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
    <div className="container-page pt-10">
      <BackLink href="/alumni">系友園地</BackLink>

      <div className="mt-10 grid gap-12 md:grid-cols-[320px_minmax(0,1fr)] md:gap-20">
        {/* 左欄：基本資料與按鈕 */}
        <aside className="md:sticky md:top-28 md:self-start">
          <div className="aspect-square w-48 overflow-hidden bg-panel md:w-full">
            {p.photo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={p.photo} alt={p.name} className="h-full w-full object-cover" />
            ) : (
              <InitialsPanel name={p.name} />
            )}
          </div>
          <h1 className="h-page mt-8">{p.name}</h1>
          {subtitle && <p className="mt-2 text-body text-ash">{subtitle}</p>}
          {(p.isTeacher || p.fields.length > 0) && (
            <div className="mt-4 flex flex-wrap gap-2">
              {p.isTeacher && <span className="tag">老師</span>}
              {p.fields.map((f) => (
                <span key={f} className="tag">{f}</span>
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
                      <Link href={contactHref("question")} className="btn btn-dark w-full">線上提問</Link>
                    )}
                    {p.acceptCoffee && (
                      <Link href={contactHref("coffee")} className={`btn w-full ${p.acceptQuestion ? "btn-outline" : "btn-dark"}`}>
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
          <h2 className="h-section">{p.name}的故事</h2>
          {story ? (
            <>
              <blockquote className="mt-8 border-l-2 border-ink pl-6 font-serif text-section text-ink-strong">「{story.tagline}」</blockquote>
              <div className="mt-14 space-y-12">
                {sections.map((s) => (
                  <section key={s.key}>
                    <h3 className="h-item">{s.title}</h3>
                    <div className="prose-story mt-4 text-body">
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
  );
}
