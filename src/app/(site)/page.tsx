import Link from "next/link";
import { getSiteContent, latestStories } from "@/lib/queries";
import { HeroIllustration } from "@/components/HeroIllustration";
import { StoryCard } from "@/components/StoryCard";

export const dynamic = "force-dynamic";

const DILEMMA_TONES = ["bg-clay text-white", "bg-gold-pale text-espresso", "bg-olive text-white"];

export default async function HomePage() {
  const [c, stories] = await Promise.all([getSiteContent(), latestStories(3)]);
  const dilemmas = [1, 2, 3].map((i) => ({ who: c[`about.dilemma${i}.who`], text: c[`about.dilemma${i}.text`] }));

  return (
    <>
      {/* 主視覺 */}
      <section className="container-page pt-10 md:pt-16">
        <p className="eyebrow text-stone">{c["hero.eyebrow"]}</p>
        <h1 className="display mt-5 whitespace-pre-line text-[34px] leading-[1.25] sm:text-[44px] md:text-[72px] md:leading-[1.1] lg:text-[84px]">
          {c["hero.tagline"]}
        </h1>
        <div className="mt-7 flex flex-col gap-6 md:mt-9 md:flex-row md:items-end md:justify-between">
          <p className="max-w-xl text-[17px] leading-relaxed text-stone md:text-[19px]">{c["hero.lead"]}</p>
          <Link href="/alumni" className="btn btn-stone self-start md:self-auto">
            認識系友 <span aria-hidden>→</span>
          </Link>
        </div>
      </section>
      <div className="container-page mt-10 md:mt-14">
        <div className="relative aspect-[4/3] overflow-hidden rounded-[28px] bg-surface-grey md:aspect-[16/7] md:rounded-[40px]">
          {c["hero.image"] ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={c["hero.image"]} alt="左岸計畫主視覺" className="absolute inset-0 h-full w-full object-cover" />
          ) : (
            <HeroIllustration className="absolute inset-0 h-full w-full" />
          )}
        </div>
      </div>

      {/* 關於計畫 */}
      <section id="about" className="container-page pt-24 md:pt-36">
        <div className="grid gap-8 md:grid-cols-[1fr_1.15fr] md:gap-16">
          <div>
            <p className="eyebrow">關於計畫</p>
            <h2 className="display mt-4 text-[32px] md:text-[48px]">{c["about.title"]}</h2>
          </div>
          <div className="space-y-5 text-[17px] leading-[1.85] text-stone">
            {c["about.spirit"].split(/\n{2,}/).map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>
        </div>

        <h3 className="display mt-20 text-[26px] md:mt-28 md:text-[34px]">{c["about.dilemmas.title"]}</h3>
        <div className="mt-8 grid gap-4 md:grid-cols-3 md:gap-5">
          {dilemmas.map((d, i) => (
            <div key={i} className={`flex min-h-[200px] flex-col justify-between rounded-card p-7 ${DILEMMA_TONES[i]}`}>
              <p className="eyebrow !text-current opacity-80">{d.who}</p>
              <p className="display mt-10 text-[22px] leading-[1.5]">{d.text}</p>
            </div>
          ))}
        </div>
        {c["about.closing"] && (
          <p className="mx-auto mt-16 max-w-2xl text-center font-serif text-[19px] font-light leading-[1.8] text-stone md:mt-24 md:text-[22px]">
            {c["about.closing"]}
          </p>
        )}
      </section>

      {/* 系友故事 */}
      <section className="pt-24 md:pt-36">
        <div className="container-page flex items-end justify-between gap-6">
          <div>
            <p className="eyebrow">系友故事</p>
            <h2 className="display mt-4 text-[32px] md:text-[48px]">走過的路，留給後來的人</h2>
          </div>
        </div>
        {stories.length ? (
          <>
            <div className="snap-row mt-10 flex gap-4 overflow-x-auto px-4 pb-2 md:container-page md:mt-12 md:grid md:grid-cols-3 md:gap-5 md:overflow-visible">
              {stories.map((s) => (
                <div key={s.userId} className="w-[82%] shrink-0 md:w-auto">
                  <StoryCard s={s} />
                </div>
              ))}
            </div>
            <div className="container-page mt-10">
              <Link href="/alumni" className="btn btn-outline">
                看更多系友 <span aria-hidden>→</span>
              </Link>
            </div>
          </>
        ) : (
          <div className="container-page mt-10">
            <div className="card p-10 text-center">
              <p className="display text-[24px]">第一篇故事，正在等你寫下</p>
              <Link href="/me/story" className="btn btn-outline mt-6">留下你的故事</Link>
            </div>
          </div>
        )}
      </section>
    </>
  );
}
