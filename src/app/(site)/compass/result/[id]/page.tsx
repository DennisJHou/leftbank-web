import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getAiSession, getOwnSession, previousCddq } from "@/lib/compass";
import {
  CATEGORIES,
  levelOf,
  LEVEL_LABEL,
  SERVICES_BY_CATEGORY,
  SUBSCALE_ORDER,
  SUBSCALES,
  type CategoryKey,
  type CddqAnswers,
  type CddqScores,
  type Service,
} from "@/lib/cddq";
import { aiAvailability, type AiReport } from "@/lib/ai";
import { cddqTags, type Tag } from "@/lib/tagging";
import { recommendAlumni, type RecommendedAlumni } from "@/lib/recommend";
import { DEFAULT_VISIBILITY } from "@/lib/queries";
import { RadarChart } from "@/components/compass/RadarChart";
import { Meter } from "@/components/compass/Meter";
import { Avatar } from "@/components/Avatar";
import { Arrow, BackLink, EmptyState } from "@/components/ui";
import { ScrollFx } from "@/components/ScrollFx";
import { WASH } from "@/components/art/sketch";

export const metadata = { title: "我的職涯羅盤" };

const fmtDate = (d: Date) => new Date(d).toLocaleDateString("zh-TW", { year: "numeric", month: "long", day: "numeric" });
const CAT_KEYS = Object.keys(CATEGORIES) as CategoryKey[];
const NUMERAL_WASHES = [WASH.clay, WASH.ochre, WASH.sage];
const delay = (ms: number) => ({ "--delay": `${ms}ms` }) as React.CSSProperties;

/** 結果頁的外框：方格紙、捲動效果、返回連結 */
function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <ScrollFx />
      <div className="container-page pt-10">
        <BackLink href="/compass">職涯羅盤</BackLink>
        {children}
      </div>
    </div>
  );
}

const ALL_SERVICES: Record<string, Service> = Object.fromEntries(
  Object.values(SERVICES_BY_CATEGORY)
    .flat()
    .map((s) => [s.key, s]),
);
ALL_SERVICES.talk = SERVICES_BY_CATEGORY.inconsistent.find((s) => s.key === "talk")!;

export default async function ResultPage({ params }: PageProps<"/compass/result/[id]">) {
  const { id } = await params;
  const user = await requireUser(`/compass/result/${id}`);
  const session = await getOwnSession(id, user.id);
  if (!session) notFound();
  if (session.status !== "completed") redirect("/compass/ai");

  // AI 對談只能用一次：已經用過、或目前沒開放時，不推薦 AI 對談
  const [availability, aiSession] = await Promise.all([aiAvailability(), getAiSession(user.id)]);
  const aiUsable = availability === "open" && !aiSession;
  const filterServices = (list: Service[]) => list.filter((s) => s.key !== "ai" || aiUsable);

  if (session.kind === "ai") {
    const report = session.report!;
    const alumni = await recommendAlumni(user.id, report.tags);
    return <AiResult report={report} date={session.created_at} alumni={alumni} services={filterServices(report.services.map((k) => ALL_SERVICES[k]).filter(Boolean))} />;
  }

  const scores = session.scores!;
  const answers = session.answers as CddqAnswers;
  const prev = await previousCddq(user.id, session.created_at);
  const tags: Tag[] = cddqTags(answers, scores);
  const alumni = await recommendAlumni(user.id, tags);

  // 依最主要困難所屬的大類，推薦服務（去除重複）
  const cats = [...new Set(scores.top.map((k) => SUBSCALES[k].category))];
  const services = filterServices(
    [...new Map(cats.flatMap((c) => SERVICES_BY_CATEGORY[c]).map((s) => [s.key, s])).values()],
  ).slice(0, 4);

  const topCat = [...CAT_KEYS].sort((a, b) => scores.categories[b] - scores.categories[a])[0];
  const allLow = CAT_KEYS.every((c) => levelOf(scores.categories[c]) === "low");

  return (
    <Shell>
      <span className="eyebrow rise mt-12" style={delay(0)}>#{fmtDate(session.created_at)} 的羅盤</span>
      <h1 className="h-feature rise mt-3 max-w-4xl" style={delay(80)}>
        {allLow ? "三大類都在穩定的範圍" : `你目前最需要處理的是「${CATEGORIES[topCat].label}」`}
      </h1>
      <p className="prose-airy rise mt-5 max-w-2xl text-ash" style={delay(160)}>
        {allLow ? "三大類都在穩定的範圍。下面列出相對較高的面向，可以作為下一步的參考。" : CATEGORIES[topCat].summary}
      </p>
      {!scores.validity.ok && (
        <p className="notice mt-6 max-w-2xl">
          有 {scores.validity.failed.length} 題確認作答品質的題目沒有照指示作答，這份結果可能不太準確。有空的話可以重新測驗一次。
        </p>
      )}

      <div className="mt-16 grid gap-14 border-t border-hairline pt-14 lg:grid-cols-[1fr_1.1fr] lg:gap-20">
        <section data-reveal>
          <h2 className="h-section tracking-[0.1em]">三大類</h2>
          <div className="mt-8 space-y-8">
            {CAT_KEYS.map((c) => (
              <Meter
                key={c}
                label={CATEGORIES[c].label}
                levelLabel={LEVEL_LABEL[levelOf(scores.categories[c])]}
                value={scores.categories[c]}
                previous={prev?.scores.categories[c]}
              />
            ))}
          </div>
          {prev && (
            <p className="mt-6 text-note text-ash">深色刻度為 {fmtDate(prev.created_at)} 的結果。分數下降代表比較不卡了。</p>
          )}
        </section>
        <section data-reveal style={delay(120)}>
          <h2 className="h-section tracking-[0.1em]">十個面向</h2>
          <div className="paper-card mt-8 p-4 md:p-6">
            <RadarChart
              axes={SUBSCALE_ORDER.map((k) => ({
                key: k,
                label: SUBSCALES[k].label,
                value: scores.subscales[k],
                previous: prev?.scores.subscales[k] ?? null,
              }))}
              previousLabel={prev ? fmtDate(prev.created_at) : undefined}
            />
          </div>
        </section>
      </div>

      <section className="mt-20 border-t border-hairline pt-14">
        <h2 className="h-section tracking-[0.1em]" data-reveal>{allLow ? "相對較高的面向" : "最主要的困難"}</h2>
        <div className="mt-8 grid gap-5 md:grid-cols-3">
          {scores.top.map((k, i) => (
            <TopCard key={k} k={k} scores={scores} index={i} />
          ))}
        </div>
      </section>

      <Recommendations services={services} alumni={alumni} />

      <div className="mt-16 flex flex-wrap gap-3 border-t border-hairline pt-10">
        <Link href="/compass/cddq" className="btn btn-primary">重新測驗</Link>
        <Link href="/me?tab=records" className="btn">我的羅盤紀錄</Link>
      </div>
    </Shell>
  );
}

const NUMERALS = ["一", "二", "三", "四", "五"];

function TopCard({ k, scores, index }: { k: (typeof SUBSCALE_ORDER)[number]; scores: CddqScores; index: number }) {
  const s = SUBSCALES[k];
  return (
    <div className="paper-card flex flex-col p-6 md:p-7" data-reveal style={delay(index * 120)}>
      <span className="numeral mb-5 h-10 w-10 text-[1.0625rem]" style={{ background: NUMERAL_WASHES[index % NUMERAL_WASHES.length] }} aria-hidden>
        {NUMERALS[index] ?? index + 1}
      </span>
      <h3 className="h-item tracking-[0.1em]">{s.label}</h3>
      <p className="mt-1 text-meta text-ash">
        {CATEGORIES[s.category].label}，{LEVEL_LABEL[levelOf(scores.subscales[k])]} {scores.subscales[k].toFixed(1)}
      </p>
      <p className="mt-4 text-meta leading-[1.85] tracking-[0.03em] text-ink">{s.explain}</p>
    </div>
  );
}

function Recommendations({ services, alumni }: { services: Service[]; alumni: RecommendedAlumni[] }) {
  return (
    <>
      {services.length > 0 && (
        <section className="mt-20 border-t border-hairline pt-14">
          <h2 className="h-section tracking-[0.1em]" data-reveal>推薦的服務</h2>
          <div className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
            {services.map((s, i) => (
              <Link
                key={s.key}
                href={s.href}
                className="paper-card group flex flex-col p-6 transition-colors hover:border-river"
                data-reveal
                style={delay(i * 100)}
              >
                <h3 className="h-item tracking-[0.08em]">{s.title}</h3>
                <p className="mt-2 flex-1 text-meta text-ash">{s.text}</p>
                <span className="link-arrow mt-5">
                  前往 <Arrow />
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}
      <section className="mt-20 border-t border-hairline pt-14">
        <h2 className="h-section tracking-[0.1em]" data-reveal>推薦的系友</h2>
        {alumni.length ? (
          <div className="mt-8 grid gap-5 md:grid-cols-3">
            {alumni.map((a, i) => {
              const v = { ...DEFAULT_VISIBILITY, ...a.visibility };
              return (
                <Link
                  key={a.id}
                  href={`/alumni/${a.id}`}
                  className="paper-card group flex flex-col p-6 transition-colors hover:border-river"
                  data-reveal
                  style={delay(i * 100)}
                >
                  <div className="flex items-center gap-4">
                    <Avatar name={a.name} src={v.photo === "public" ? a.photo_url : null} size={56} className="rounded-full" />
                    <div className="min-w-0">
                      <p className="h-item tracking-[0.1em] transition-colors group-hover:text-river">{a.name}</p>
                      {v.title === "public" && a.title && <p className="truncate text-meta text-ash">{a.title}</p>}
                    </div>
                  </div>
                  {a.tagline && <p className="mt-5 flex-1 text-tagline">「{a.tagline}」</p>}
                  <p className="mt-5 text-note text-ash">
                    {[a.accept_question && "可線上提問", a.accept_coffee && "可約咖啡"].filter(Boolean).join(" · ")}
                  </p>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="mt-8">
            <EmptyState />
          </div>
        )}
      </section>
    </>
  );
}

function AiResult({ report, date, alumni, services }: { report: AiReport; date: Date; alumni: RecommendedAlumni[]; services: Service[] }) {
  const LEVEL_TEXT = { low: "穩定", moderate: "有些卡關", high: "明顯卡關" } as const;
  return (
    <Shell>
      <span className="eyebrow rise mt-12" style={delay(0)}>#AI 生涯對談報告・{fmtDate(date)}</span>
      <h1 className="h-feature rise mt-3 max-w-4xl" style={delay(80)}>{report.summary}</h1>

      <div className="mt-16 grid gap-14 border-t border-hairline pt-14 lg:grid-cols-[1fr_1.4fr] lg:gap-20">
        <section data-reveal>
          <h2 className="h-section tracking-[0.1em]">三大類</h2>
          <ul className="mt-8 divide-y divide-hairline border-y border-hairline">
            {CAT_KEYS.map((c) => (
              <li key={c} className="flex items-center justify-between py-4">
                <span className="h-item">{CATEGORIES[c].label}</span>
                <span className="flex items-center gap-3 text-meta text-ash">
                  <span className="flex gap-1" aria-hidden>
                    {[0, 1, 2].map((i) => (
                      <span key={i} className={`h-2 w-5 ${i <= ["low", "moderate", "high"].indexOf(report.categories[c]) ? "bg-chart" : "bg-chart-track"}`} />
                    ))}
                  </span>
                  {LEVEL_TEXT[report.categories[c]]}
                </span>
              </li>
            ))}
          </ul>
        </section>
        <section data-reveal style={delay(120)}>
          <h2 className="h-section tracking-[0.1em]">你正在面對的</h2>
          <div className="mt-8 space-y-8">
            {report.focus.map((f, i) => (
              <div key={i}>
                <h3 className="h-item tracking-[0.08em]">{f.title}</h3>
                <p className="prose-airy mt-2">{f.text}</p>
              </div>
            ))}
          </div>
        </section>
      </div>

      {report.next_steps.length > 0 && (
        <section className="mt-20 border-t border-hairline pt-14">
          <h2 className="h-section tracking-[0.1em]" data-reveal>接下來可以做的事</h2>
          <ol className="mt-8 space-y-5">
            {report.next_steps.map((s, i) => (
              <li key={i} className="flex items-start gap-4" data-reveal style={delay(i * 100)}>
                <span className="numeral h-10 w-10 text-[1.0625rem]" style={{ background: NUMERAL_WASHES[i % NUMERAL_WASHES.length] }} aria-hidden>
                  {NUMERALS[i] ?? i + 1}
                </span>
                <span className="prose-airy pt-1.5">{s}</span>
              </li>
            ))}
          </ol>
        </section>
      )}

      <Recommendations services={services} alumni={alumni} />

      <div className="mt-16 flex flex-wrap gap-3 border-t border-hairline pt-10">
        <Link href="/compass/cddq" className="btn btn-primary">生涯決策困難量表</Link>
        <Link href="/me?tab=records" className="btn">我的羅盤紀錄</Link>
      </div>
    </Shell>
  );
}
