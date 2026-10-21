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

export const metadata = { title: "我的職涯羅盤" };

const fmtDate = (d: Date) => new Date(d).toLocaleDateString("zh-TW", { year: "numeric", month: "long", day: "numeric" });
const CAT_KEYS = Object.keys(CATEGORIES) as CategoryKey[];

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
    <div className="container-page pt-10">
      <BackLink href="/compass">職涯羅盤</BackLink>
      <p className="mt-12 text-meta text-ash">{fmtDate(session.created_at)}</p>
      <h1 className="h-page mt-2 max-w-4xl">
        {allLow ? "三大類都在穩定的範圍" : `你目前最需要處理的是「${CATEGORIES[topCat].label}」`}
      </h1>
      <p className="mt-4 max-w-2xl text-body text-ash">
        {allLow ? "三大類都在穩定的範圍。下面列出相對較高的面向，可以作為下一步的參考。" : CATEGORIES[topCat].summary}
      </p>
      {!scores.validity.ok && (
        <p className="notice mt-6 max-w-2xl">
          有 {scores.validity.failed.length} 題確認作答品質的題目沒有照指示作答，這份結果可能不太準確。有空的話可以重新測驗一次。
        </p>
      )}

      <div className="mt-16 grid gap-14 border-t border-hairline pt-14 lg:grid-cols-[1fr_1.1fr] lg:gap-20">
        <section>
          <h2 className="h-section">三大類</h2>
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
        <section>
          <h2 className="h-section">十個面向</h2>
          <div className="card mt-8 p-4 md:p-6">
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
        <h2 className="h-section">{allLow ? "相對較高的面向" : "最主要的困難"}</h2>
        <div className="mt-8 grid gap-5 md:grid-cols-3">
          {scores.top.map((k) => (
            <TopCard key={k} k={k} scores={scores} />
          ))}
        </div>
      </section>

      <Recommendations services={services} alumni={alumni} />

      <div className="mt-16 flex flex-wrap gap-3 border-t border-hairline pt-10">
        <Link href="/compass/cddq" className="btn btn-dark">重新測驗</Link>
        <Link href="/me?tab=records" className="btn btn-outline">我的羅盤紀錄</Link>
      </div>
    </div>
  );
}

function TopCard({ k, scores }: { k: (typeof SUBSCALE_ORDER)[number]; scores: CddqScores }) {
  const s = SUBSCALES[k];
  return (
    <div className="card flex flex-col p-6 md:p-7">
      <h3 className="h-item">{s.label}</h3>
      <p className="mt-1 text-meta text-ash">
        {CATEGORIES[s.category].label}，{LEVEL_LABEL[levelOf(scores.subscales[k])]} {scores.subscales[k].toFixed(1)}
      </p>
      <p className="mt-4 text-meta text-ink">{s.explain}</p>
    </div>
  );
}

function Recommendations({ services, alumni }: { services: Service[]; alumni: RecommendedAlumni[] }) {
  return (
    <>
      {services.length > 0 && (
        <section className="mt-20 border-t border-hairline pt-14">
          <h2 className="h-section">推薦的服務</h2>
          <div className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
            {services.map((s) => (
              <Link key={s.key} href={s.href} className="panel group flex flex-col p-6 transition-colors hover:bg-hairline">
                <h3 className="h-item">{s.title}</h3>
                <p className="mt-2 flex-1 text-meta text-ash">{s.text}</p>
                <span className="mt-5 inline-flex items-center gap-2 text-meta font-medium text-ink group-hover:underline group-hover:underline-offset-4">
                  前往 <Arrow />
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}
      <section className="mt-20 border-t border-hairline pt-14">
        <h2 className="h-section">推薦的系友</h2>
        {alumni.length ? (
          <div className="mt-8 grid gap-5 md:grid-cols-3">
            {alumni.map((a) => {
              const v = { ...DEFAULT_VISIBILITY, ...a.visibility };
              return (
                <Link key={a.id} href={`/alumni/${a.id}`} className="card group flex flex-col p-6">
                  <div className="flex items-center gap-4">
                    <Avatar name={a.name} src={v.photo === "public" ? a.photo_url : null} size={56} />
                    <div className="min-w-0">
                      <p className="h-item group-hover:underline group-hover:underline-offset-4">{a.name}</p>
                      {v.title === "public" && a.title && <p className="truncate text-meta text-ash">{a.title}</p>}
                    </div>
                  </div>
                  {a.tagline && <p className="mt-5 flex-1 font-serif text-item leading-[1.7]">「{a.tagline}」</p>}
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
    <div className="container-page pt-10">
      <BackLink href="/compass">職涯羅盤</BackLink>
      <p className="mt-12 text-meta text-ash">AI 生涯對談報告，{fmtDate(date)}</p>
      <h1 className="h-page mt-2 max-w-4xl">{report.summary}</h1>

      <div className="mt-16 grid gap-14 border-t border-hairline pt-14 lg:grid-cols-[1fr_1.4fr] lg:gap-20">
        <section>
          <h2 className="h-section">三大類</h2>
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
        <section>
          <h2 className="h-section">你正在面對的</h2>
          <div className="mt-8 space-y-8">
            {report.focus.map((f, i) => (
              <div key={i}>
                <h3 className="h-item">{f.title}</h3>
                <p className="mt-2 text-body">{f.text}</p>
              </div>
            ))}
          </div>
        </section>
      </div>

      {report.next_steps.length > 0 && (
        <section className="mt-20 border-t border-hairline pt-14">
          <h2 className="h-section">接下來可以做的事</h2>
          <ol className="mt-8 space-y-4">
            {report.next_steps.map((s, i) => (
              <li key={i} className="flex gap-4 text-body">
                <span className="w-5 shrink-0 font-serif text-ash">{i + 1}.</span>
                {s}
              </li>
            ))}
          </ol>
        </section>
      )}

      <Recommendations services={services} alumni={alumni} />

      <div className="mt-16 flex flex-wrap gap-3 border-t border-hairline pt-10">
        <Link href="/compass/cddq" className="btn btn-dark">生涯決策困難量表</Link>
        <Link href="/me?tab=records" className="btn btn-outline">我的羅盤紀錄</Link>
      </div>
    </div>
  );
}
