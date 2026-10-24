import Link from "next/link";
import { getSiteContent, latestStories } from "@/lib/queries";
import { ITEMS } from "@/lib/cddq";
import { StoryCard } from "@/components/StoryCard";
import { Arrow, EmptyState } from "@/components/ui";
import { RiverbankScene } from "@/components/art/RiverbankScene";
import { Venn } from "@/components/art/Venn";
import { CompassSketch } from "@/components/art/CompassSketch";
import { ScrollFx } from "@/components/ScrollFx";
import { WASH, Wash, blob } from "@/components/art/sketch";

export const dynamic = "force-dynamic";

const paragraphs = (text: string) => text.split(/\n{2,}/).filter((p) => p.trim());
/** 直排標語：逗號、句號之後或換行處斷成新的一行 */
const columns = (text: string) =>
  text
    .split(/(?<=[，。；！？])|\n/)
    .map((t) => t.trim())
    .filter(Boolean);
const delay = (ms: number) => ({ "--delay": `${ms}ms` }) as React.CSSProperties;
const shift = (px: number) => ({ "--shift": `${px}px` }) as React.CSSProperties;

const NUMERALS = ["一", "二", "三"];
const DILEMMA_WASHES = [WASH.sage, WASH.ochre, WASH.clay];

export default async function HomePage() {
  const [c, stories] = await Promise.all([getSiteContent(), latestStories(3)]);
  const dilemmas = [1, 2, 3].map((i) => ({ who: c[`about.dilemma${i}.who`], text: c[`about.dilemma${i}.text`] }));
  const title = columns(c["hero.tagline"]);
  const subtitle = columns(c["hero.subtitle"] ?? "");
  const sealDelay = 150 + (title.length + subtitle.length) * 300 + 200;

  return (
    <div>
      <ScrollFx />

      {/* 主視覺：直排標語＋河岸插畫 */}
      <section data-progress="exit" className="relative overflow-hidden">
        {/* 主標題置中、落在橋的正上方；副標與印章掛在左邊 */}
        <div className="container-page relative z-10 pt-12 md:pt-16">
          <div className="parallax-exit fade-exit grid grid-cols-[1fr_auto_1fr] items-start gap-5 md:gap-9" style={shift(-80)}>
            <h1 className="hero-title col-start-2 row-start-1 flex flex-row-reverse items-start gap-2 md:gap-4">
              {title.map((t, i) => (
                <span key={i} className="vertical rise" style={delay(150 + i * 300)}>
                  {t}
                </span>
              ))}
            </h1>
            <div className="col-start-1 row-start-1 flex flex-col items-start gap-5 justify-self-end pt-[4.5em] md:pt-[5em]">
              {subtitle.length > 0 && (
                <p className="hero-sub flex flex-row-reverse items-start gap-1">
                  {subtitle.map((t, i) => (
                    <span key={i} className="vertical rise" style={delay(150 + (title.length + i) * 300)}>
                      {t}
                    </span>
                  ))}
                </p>
              )}
              <span className="seal stamp-in text-[0.9375rem]" style={delay(sealDelay)} aria-hidden>
                左岸計畫
              </span>
            </div>
          </div>
          {/* 兩個出口：學生、系友各走各的路 */}
          <div className="rise relative z-10 mt-10 flex flex-wrap justify-center gap-3 md:mt-12" style={delay(sealDelay + 300)}>
            <Link href="/alumni" className="btn btn-primary btn-hero">
              我是學生 <Arrow />
            </Link>
            <Link href="/for-alumni" className="btn btn-hero">
              我是系友 <Arrow />
            </Link>
          </div>
        </div>
        <RiverbankScene image={c["hero.image"]} className="-mt-10 md:-mt-[18vw]" />
      </section>

      {/* 系友故事：訪客最想先看到的，排在計畫緣起之前 */}
      <section id="stories" className="scroll-mt-24 pt-28 md:pt-40">
        <div className="container-page flex flex-wrap items-end justify-between gap-6">
          <div>
            <span className="eyebrow" data-reveal>
              #系友故事
            </span>
            <h2 className="h-feature mt-4" data-reveal style={delay(80)}>
              學長姐走過的路
            </h2>
          </div>
          <Link href="/alumni" className="btn" data-reveal style={delay(160)}>
            看更多系友 <Arrow />
          </Link>
        </div>
        {stories.length ? (
          <div className="snap-row mt-12 flex gap-5 overflow-x-auto px-5 md:container-page md:grid md:grid-cols-3 md:gap-10 md:overflow-visible">
            {stories.map((s, i) => (
              <div key={s.userId} className="w-[82%] shrink-0 md:w-auto">
                <StoryCard s={s} index={i} />
              </div>
            ))}
          </div>
        ) : (
          <div className="container-page mt-12">
            <EmptyState />
          </div>
        )}
      </section>

      {/* 三重困境：三個圓交疊，交集是左岸 */}
      <section id="dilemmas" className="container-page grid scroll-mt-24 items-center gap-14 pt-28 md:grid-cols-[6fr_5fr] md:gap-20 md:pt-40">
        <div>
          <span className="eyebrow" data-reveal>
            #計畫緣起
          </span>
          <h2 className="h-feature mt-4" data-reveal style={delay(80)}>
            {c["about.dilemmas.title"]}
          </h2>
          <ol className="mt-10 space-y-7">
            {dilemmas.map((d, i) => (
              <li key={i} className="flex gap-5" data-reveal style={delay(160 + i * 120)}>
                <span
                  className="grid h-12 w-12 shrink-0 place-items-center rounded-full font-serif text-[1.25rem] font-semibold text-ink-strong"
                  style={{ background: DILEMMA_WASHES[i] }}
                  aria-hidden
                >
                  {NUMERALS[i]}
                </span>
                <div>
                  <h3 className="h-item tracking-[0.12em]">{d.who}</h3>
                  <p className="prose-airy mt-1 text-ash">{d.text}</p>
                </div>
              </li>
            ))}
          </ol>
          <p className="quote-kai mt-12" data-reveal>
            左岸計畫，想站在三者的交集——讓學術的底蘊、業界的視角與學生的熱血在此交織，把各自的未竟之志，化為改變現實的具體力量。
          </p>
        </div>
        <div data-reveal="fade">
          <Venn labels={dilemmas.map((d) => d.who.replace(/端$/, ""))} />
        </div>
      </section>

      {/* 關於計畫：大字「左岸」＋計畫緣起 */}
      <section id="about" className="container-page pt-24 md:pt-36">
        <div className="max-w-[44rem]">
          <span className="eyebrow" data-reveal>
            #關於計畫
          </span>
          <h2 className="h-feature mt-4" data-reveal style={delay(80)}>
            從塞納河左岸，
            <br />
            到臺大心理系
          </h2>
          <div className="prose-airy mt-8" data-reveal style={delay(160)}>
            {paragraphs(c["about.spirit"]).map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>
          {c["about.closing"] && (
            <blockquote className="quote-kai mt-10" data-reveal style={delay(240)}>
              {c["about.closing"]}
            </blockquote>
          )}
        </div>
      </section>

      {/* 職涯羅盤：指針跟著捲動轉 */}
      <section data-progress className="container-page grid items-center gap-12 pt-28 md:grid-cols-[5fr_7fr] md:gap-20 md:pt-40">
        <div className="mx-auto w-full max-w-[380px]" data-reveal="draw">
          <CompassSketch />
        </div>
        <div>
          <span className="eyebrow" data-reveal>
            #職涯羅盤
          </span>
          <h2 className="h-feature mt-4" data-reveal style={delay(80)}>
            感到迷惘嗎？
            <br />
            讓心理學成為你探索的起點。
          </h2>
          <p className="lede mt-6" data-reveal style={delay(160)}>
            {ITEMS.length} 題量表 × AI 生涯對談
          </p>
          <p className="prose-airy mt-4" data-reveal style={delay(200)}>
            本測驗採用「生涯決策困難量表」（共 {ITEMS.length} 題，約需 8 分鐘），協助你將抽象的迷惘轉化為清晰的決策維度，並根據分析結果推薦最契合的實務方案與學長姊經驗。
          </p>
          <p className="prose-airy mt-4" data-reveal style={delay(240)}>
            此外，更提供最多 6 輪的 AI 互動對話，陪伴你針對目前的卡點反覆對話、尋找破局點。
          </p>
          <Link href="/compass" className="btn mt-9" data-reveal style={delay(280)}>
            開始探索 <Arrow />
          </Link>
        </div>
      </section>
    </div>
  );
}
