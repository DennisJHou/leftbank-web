import Link from "next/link";
import { getSiteContent, latestStories } from "@/lib/queries";
import { HeroIllustration } from "@/components/HeroIllustration";
import { StoryCard } from "@/components/StoryCard";
import { Arrow, EmptyState } from "@/components/ui";

export const dynamic = "force-dynamic";

const paragraphs = (text: string) => text.split(/\n{2,}/).filter((p) => p.trim());

export default async function HomePage() {
  const [c, stories] = await Promise.all([getSiteContent(), latestStories(3)]);
  const dilemmas = [1, 2, 3].map((i) => ({ who: c[`about.dilemma${i}.who`], text: c[`about.dilemma${i}.text`] }));

  return (
    <>
      {/* 主視覺 */}
      <section className="relative h-[72vh] max-h-[820px] min-h-[480px] overflow-hidden bg-ink-band">
        {c["hero.image"] ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={c["hero.image"]} alt="" className="absolute inset-0 h-full w-full object-cover" />
        ) : (
          <HeroIllustration className="absolute inset-0 h-full w-full" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-black/0" />
        <div className="container-page absolute inset-x-0 bottom-0 pb-14 text-center md:pb-20">
          <h1 className="h-display mx-auto max-w-4xl text-white">{c["hero.tagline"]}</h1>
          <Link href="/alumni" className="btn btn-light mt-9">
            認識系友 <Arrow />
          </Link>
        </div>
      </section>

      {/* 關於計畫 */}
      <section id="about" className="container-page pt-24 md:pt-32">
        <div className="grid gap-8 md:grid-cols-[minmax(0,1fr)_minmax(0,1.7fr)] md:gap-20">
          <h2 className="h-section">關於計畫</h2>
          <div className="space-y-6 text-body">
            {[...paragraphs(c["about.spirit"]), ...paragraphs(c["about.closing"] ?? "")].map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>
        </div>
      </section>

      {/* 心理人的三重困境 */}
      <section className="container-page pt-20 md:pt-28">
        <div className="grid gap-8 border-t border-hairline pt-14 md:grid-cols-[minmax(0,1fr)_minmax(0,1.7fr)] md:gap-20 md:pt-20">
          <h2 className="h-section">{c["about.dilemmas.title"]}</h2>
          <div className="space-y-8">
            {dilemmas.map((d, i) => (
              <div key={i}>
                <h3 className="h-item">{d.who}</h3>
                <p className="mt-2 text-body">{d.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 系友故事 */}
      <section className="pt-24 md:pt-32">
        <div className="container-page">
          <div className="border-t border-hairline pt-14 md:pt-20">
            <h2 className="h-section">系友故事</h2>
          </div>
        </div>
        {stories.length ? (
          <>
            <div className="snap-row mt-10 flex gap-5 overflow-x-auto px-5 md:container-page md:grid md:grid-cols-3 md:gap-8 md:overflow-visible">
              {stories.map((s) => (
                <div key={s.userId} className="w-[82%] shrink-0 md:w-auto">
                  <StoryCard s={s} />
                </div>
              ))}
            </div>
            <div className="container-page mt-12 text-center">
              <Link href="/alumni" className="btn btn-dark">
                看更多系友 <Arrow />
              </Link>
            </div>
          </>
        ) : (
          <div className="container-page mt-10">
            <EmptyState />
          </div>
        )}
      </section>
    </>
  );
}
