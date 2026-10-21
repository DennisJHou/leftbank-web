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
    <div className="container-page pt-10 md:pt-16">
      <Link href="/compass" className="text-[14px] text-ash hover:text-stone">← 職涯羅盤</Link>
      <p className="eyebrow mt-8">我的職涯羅盤 · {fmtDate(session.created_at)}</p>
      <h1 className="display mt-4 max-w-3xl text-[34px] md:text-[52px]">
        {allLow ? "整體來說，你的方向感不錯" : `你目前最需要的，是處理「${CATEGORIES[topCat].label}」`}
      </h1>
      <p className="mt-4 max-w-2xl text-[17px] leading-relaxed text-stone">
        {allLow ? "三大類都在穩定的範圍。下面列出相對較高的面向，可以作為下一步的參考。" : CATEGORIES[topCat].summary}
      </p>
      {!scores.validity.ok && (
        <p className="notice mt-6 max-w-2xl">
          有 {scores.validity.failed.length} 題確認作答品質的題目沒有照指示作答，這份結果可能不太準確。有空的話可以重新測驗一次。
        </p>
      )}

      <div className="mt-14 grid gap-12 lg:grid-cols-[1fr_1.1fr] lg:gap-16">
        <section>
          <h2 className="font-serif text-[24px] font-light">三大類</h2>
          <div className="mt-6 space-y-7">
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
            <p className="mt-6 text-[13px] text-ash">
              灰色刻度是 {fmtDate(prev.created_at)} 的結果。分數下降，代表那個面向比較不卡了。
            </p>
          )}
        </section>
        <section>
          <h2 className="font-serif text-[24px] font-light">十個面向</h2>
          <div className="card mt-6 p-4 md:p-6">
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

      <section className="mt-20">
        <h2 className="font-serif text-[24px] font-light">{allLow ? "相對較高的面向" : "最主要的困難"}</h2>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {scores.top.map((k) => (
            <TopCard key={k} k={k} scores={scores} />
          ))}
        </div>
      </section>

      <Recommendations services={services} alumni={alumni} />

      <div className="mt-16 flex flex-wrap gap-3">
        <Link href="/compass/cddq" className="btn btn-outline">重新測驗</Link>
        <Link href="/me?tab=records" className="btn text-stone">我的羅盤紀錄</Link>
      </div>
    </div>
  );
}

function TopCard({ k, scores }: { k: (typeof SUBSCALE_ORDER)[number]; scores: CddqScores }) {
  const s = SUBSCALES[k];
  return (
    <div className="card flex flex-col p-6">
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-[18px] font-medium">{s.label}</p>
        <p className="text-[13px] text-ash">{CATEGORIES[s.category].label}</p>
      </div>
      <p className="mt-1 text-[13px] text-stone">
        {LEVEL_LABEL[levelOf(scores.subscales[k])]} · {scores.subscales[k].toFixed(1)}
      </p>
      <p className="mt-4 text-[15px] leading-[1.8] text-stone">{s.explain}</p>
    </div>
  );
}

function Recommendations({ services, alumni }: { services: Service[]; alumni: RecommendedAlumni[] }) {
  return (
    <>
      {services.length > 0 && (
        <section className="mt-20">
          <h2 className="font-serif text-[24px] font-light">推薦給你的左岸服務</h2>
          <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {services.map((s) => (
              <Link key={s.key} href={s.href} className="group rounded-card bg-[#efe4d3] p-6 transition-colors hover:bg-[#e8dac4]">
                <p className="text-[17px] font-medium">{s.title}</p>
                <p className="mt-2 text-[14px] leading-relaxed text-stone">{s.text}</p>
                <p className="mt-4 text-[14px] text-stone group-hover:underline">前往 →</p>
              </Link>
            ))}
          </div>
        </section>
      )}
      <section className="mt-20">
        <h2 className="font-serif text-[24px] font-light">可以聊聊的系友</h2>
        <p className="mt-2 text-[14px] text-ash">依照你的興趣與卡關的地方，從願意接受提問或咖啡邀請的系友中挑選。</p>
        {alumni.length ? (
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {alumni.map((a) => {
              const v = { ...DEFAULT_VISIBILITY, ...a.visibility };
              return (
                <Link key={a.id} href={`/alumni/${a.id}`} className="card group flex flex-col p-6">
                  <div className="flex items-center gap-3">
                    <Avatar name={a.name} src={v.photo === "public" ? a.photo_url : null} size={52} />
                    <div className="min-w-0">
                      <p className="font-medium group-hover:underline">{a.name}</p>
                      {v.title === "public" && a.title && <p className="truncate text-[14px] text-ash">{a.title}</p>}
                    </div>
                  </div>
                  {a.tagline && <p className="mt-5 flex-1 font-serif text-[17px] leading-[1.6] text-stone">「{a.tagline}」</p>}
                  <p className="mt-5 text-[13px] text-ash">
                    {[a.accept_question && "可線上提問", a.accept_coffee && "可約咖啡"].filter(Boolean).join(" · ")}
                  </p>
                </Link>
              );
            })}
          </div>
        ) : (
          <p className="mt-6 text-[15px] text-stone">
            目前還沒有開放聯絡的系友。<Link href="/alumni" className="link">逛逛系友園地</Link>
          </p>
        )}
      </section>
    </>
  );
}

function AiResult({ report, date, alumni, services }: { report: AiReport; date: Date; alumni: RecommendedAlumni[]; services: Service[] }) {
  const LEVEL_TEXT = { low: "穩定", moderate: "有些卡關", high: "明顯卡關" } as const;
  return (
    <div className="container-page pt-10 md:pt-16">
      <Link href="/compass" className="text-[14px] text-ash hover:text-stone">← 職涯羅盤</Link>
      <p className="eyebrow mt-8">AI 生涯對談報告 · {fmtDate(date)}</p>
      <h1 className="display mt-4 max-w-3xl text-[30px] leading-[1.4] md:text-[42px]">{report.summary}</h1>

      <div className="mt-14 grid gap-12 lg:grid-cols-[1fr_1.4fr] lg:gap-16">
        <section>
          <h2 className="font-serif text-[24px] font-light">三大類</h2>
          <ul className="mt-6 divide-y divide-hairline border-y border-hairline">
            {CAT_KEYS.map((c) => (
              <li key={c} className="flex items-center justify-between py-4">
                <span className="text-[16px]">{CATEGORIES[c].label}</span>
                <span className="flex items-center gap-2 text-[14px] text-stone">
                  <span className="flex gap-1" aria-hidden>
                    {[0, 1, 2].map((i) => (
                      <span
                        key={i}
                        className={`h-2 w-5 rounded-full ${i <= ["low", "moderate", "high"].indexOf(report.categories[c]) ? "bg-[#9a5f17]" : "bg-[#efe4d3]"}`}
                      />
                    ))}
                  </span>
                  {LEVEL_TEXT[report.categories[c]]}
                </span>
              </li>
            ))}
          </ul>
        </section>
        <section>
          <h2 className="font-serif text-[24px] font-light">你正在面對的</h2>
          <div className="mt-6 space-y-6">
            {report.focus.map((f, i) => (
              <div key={i}>
                <p className="text-[17px] font-medium">{f.title}</p>
                <p className="mt-2 text-[15px] leading-[1.8] text-stone">{f.text}</p>
              </div>
            ))}
          </div>
        </section>
      </div>

      {report.next_steps.length > 0 && (
        <section className="mt-20">
          <h2 className="font-serif text-[24px] font-light">這週可以做的小事</h2>
          <ol className="mt-6 space-y-3">
            {report.next_steps.map((s, i) => (
              <li key={i} className="flex gap-4 text-[16px] leading-relaxed">
                <span className="font-serif text-[18px] text-ochre">{i + 1}</span>
                {s}
              </li>
            ))}
          </ol>
        </section>
      )}

      <Recommendations services={services} alumni={alumni} />

      <div className="mt-16 flex flex-wrap gap-3">
        <Link href="/compass/cddq" className="btn btn-outline">也做做基礎版量表</Link>
        <Link href="/me?tab=records" className="btn text-stone">我的羅盤紀錄</Link>
      </div>
    </div>
  );
}
