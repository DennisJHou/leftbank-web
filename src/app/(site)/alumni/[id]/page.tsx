import Link from "next/link";
import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { activeRequest, getPublicProfile, getPublishedStory, hasVoted } from "@/lib/queries";
import { storySections } from "@/lib/story-questions";
import { CONTACT_TYPE_LABEL, REQUEST_STATUS_LABEL, type ContactType, type RequestStatus } from "@/lib/constants";
import { InitialsPanel } from "@/components/Avatar";
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
  const subtitle = [p.title, p.company].filter(Boolean).join(" · ");

  return (
    <div className="container-page pt-8 md:pt-12">
      <Link href="/alumni" className="text-[14px] text-ash hover:text-stone">← 系友園地</Link>

      <div className="mt-8 grid gap-10 md:grid-cols-[280px_1fr] md:gap-16">
        {/* 左欄：基本資料與按鈕 */}
        <aside className="md:sticky md:top-28 md:self-start">
          <div className="aspect-square w-40 overflow-hidden rounded-card bg-surface md:w-full">
            {p.photo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={p.photo} alt={p.name} className="h-full w-full object-cover" />
            ) : (
              <InitialsPanel name={p.name} />
            )}
          </div>
          <h1 className="display mt-6 text-[36px] md:text-[40px]">{p.name}</h1>
          {subtitle && <p className="mt-2 text-[16px] text-stone">{subtitle}</p>}
          <div className="mt-4 flex flex-wrap gap-2">
            {p.isTeacher && <span className="chip">老師</span>}
            {p.fields.map((f) => (
              <span key={f} className="chip">{f}</span>
            ))}
          </div>
          {(p.classYear || p.education.length > 0) && (
            <dl className="mt-6 space-y-1 border-t border-hairline pt-5 text-[14px] text-stone">
              {p.education.length ? p.education.map((e) => <dd key={e}>{e}</dd>) : <dd>{p.classYear}</dd>}
            </dl>
          )}
          {!user && (
            <p className="mt-6 border-t border-hairline pt-5 text-[13px] text-ash">登入後可以看到屆別與學歷。</p>
          )}

          <div className="mt-8 space-y-3">
            {sent && (
              <p className="notice notice-ok">
                已送出{CONTACT_TYPE_LABEL[sent as ContactType] ?? ""}。系友回應後，我們會寫信通知你。
              </p>
            )}
            {isSelf ? (
              <p className="notice">
                這是你在系友園地的公開頁面。<Link href="/me?tab=public" className="link">調整公開設定</Link>
              </p>
            ) : (
              <>
                {canContact && pending && !sent && (
                  <p className="notice">
                    你送出的{CONTACT_TYPE_LABEL[pending.type as ContactType]}「{REQUEST_STATUS_LABEL[pending.status as RequestStatus]}」。
                    同一位系友一次只能有一筆進行中的申請。
                  </p>
                )}
                {canContact && !pending && (
                  <div className="flex flex-col gap-3">
                    <p className="text-[13px] text-ash">聯絡{p.name}</p>
                    {p.acceptQuestion && (
                      <Link href={contactHref("question")} className="btn btn-stone">✉️ 線上提問</Link>
                    )}
                    {p.acceptCoffee && (
                      <Link href={contactHref("coffee")} className={`btn ${p.acceptQuestion ? "btn-outline" : "btn-stone"}`}>
                        ☕ 約一杯咖啡
                      </Link>
                    )}
                  </div>
                )}
                {p.willingToTalk && (
                  <div className={canContact ? "pt-3" : ""}>
                    <VoteButton
                      alumniId={id}
                      initialVoted={voted}
                      loginHref={user ? undefined : `/login?next=${encodeURIComponent(`/alumni/${id}`)}`}
                    />
                  </div>
                )}
              </>
            )}
          </div>
        </aside>

        {/* 右欄：故事 */}
        <article id="story" className="min-w-0">
          {story ? (
            <>
              <p className="eyebrow">{p.name}的故事</p>
              <p className="display mt-5 text-[28px] leading-[1.45] md:text-[38px]">「{story.tagline}」</p>
              <div className="mt-12 space-y-12 md:mt-16">
                {sections.map((s) => (
                  <section key={s.key}>
                    <h2 className="font-serif text-[20px] font-normal leading-[1.5] text-stone md:text-[22px]">{s.title}</h2>
                    <div className="prose-story mt-4 text-[17px] leading-[1.9] text-ink">
                      {s.body.split(/\n{2,}/).map((para, i) => (
                        <p key={i}>{para}</p>
                      ))}
                    </div>
                  </section>
                ))}
              </div>
              <p className="mt-12 text-[13px] text-mute">
                最後更新：{new Date(story.updated_at).toLocaleDateString("zh-TW", { year: "numeric", month: "long", day: "numeric" })}
              </p>
            </>
          ) : (
            <div className="card p-10 text-center">
              <p className="display text-[22px]">{p.name}還沒有寫下故事</p>
              <p className="mt-3 text-[15px] text-stone">
                {canContact ? "不過你可以直接寫信問問他。" : "之後再回來看看吧。"}
              </p>
            </div>
          )}
        </article>
      </div>
    </div>
  );
}
