import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { compassEligibility, getAiSession } from "@/lib/compass";
import { aiAvailability, aiConfig } from "@/lib/ai";
import { ITEMS } from "@/lib/cddq";
import { one } from "@/lib/db";
import { Arrow, PageHeader } from "@/components/ui";
import { ScrollFx } from "@/components/ScrollFx";
import { CompassSketch } from "@/components/art/CompassSketch";
import { ChatSketch, ScaleSketch } from "@/components/art/MiniSketches";
import { WASH } from "@/components/art/sketch";

export const metadata = { title: "職涯羅盤" };

const delay = (ms: number) => ({ "--delay": `${ms}ms` }) as React.CSSProperties;

export default async function CompassPage() {
  const user = await getCurrentUser();
  const elig = compassEligibility(user);
  const [ai, aiSession, last] = await Promise.all([
    aiAvailability(),
    user ? getAiSession(user.id) : null,
    user
      ? one<{ id: string }>("select id from compass_sessions where user_id = $1 and status = 'completed' order by created_at desc limit 1", [user.id])
      : null,
  ]);
  const { maxTurns } = aiConfig();
  const usable = elig.ok || elig.reason === "login";
  const startHref = (path: string) => (user ? path : `/login?next=${encodeURIComponent(path)}`);

  let aiState: { text: string; href?: string; cta?: string };
  if (aiSession?.status === "completed") {
    aiState = { text: "你已經完成對談。", href: `/compass/result/${aiSession.id}`, cta: "查看報告" };
  } else if (aiSession?.status === "in_progress") {
    aiState = { text: "你有一場尚未結束的對談。", href: "/compass/ai", cta: "繼續對談" };
  } else if (ai === "open") {
    aiState = { text: `最多 ${maxTurns} 輪，每個帳號限用一次。`, href: startHref("/compass/ai"), cta: "開始對談" };
  } else if (ai === "full") {
    aiState = { text: "名額已滿。" };
  } else {
    aiState = { text: "即將推出。" };
  }

  return (
    <div className="paper-grid paper-page">
      <ScrollFx />
      <div data-progress className="container-page">
        <PageHeader eyebrow="#找到卡住的地方" title="職涯羅盤" visual={<CompassSketch />}>
          不知道下一步往哪走，常常是因為說不清楚自己卡在哪裡。先做量表，或和 AI 聊一聊，再看看哪些服務與系友幫得上忙。
        </PageHeader>
        {!elig.ok && elig.reason !== "login" && <p className="notice mb-10 max-w-2xl">{elig.reason}</p>}

        <div className="grid gap-6 md:grid-cols-2 md:gap-8">
          <section className="paper-card flex flex-col p-7 md:p-10" data-reveal>
            <div className="flex items-start justify-between gap-6">
              <span className="numeral" style={{ background: WASH.ochre }} aria-hidden>
                一
              </span>
              <div data-reveal="draw">
                <ScaleSketch className="h-24 w-24 md:h-28 md:w-28" />
              </div>
            </div>
            <h2 className="h-section mt-6 tracking-[0.1em]">生涯決策困難量表</h2>
            <p className="lede mt-2 text-meta">{ITEMS.length} 題・約 10 分鐘</p>
            <p className="prose-airy mt-4 flex-1 text-ash">結果會列出你最主要的困難，並推薦服務與系友。</p>
            <div className="mt-8">
              {usable ? (
                <Link href={startHref("/compass/cddq")} className="btn-pill btn-pill-solid">
                  {user ? "開始作答" : "登入後開始"} <Arrow />
                </Link>
              ) : (
                <span className="btn-pill" aria-disabled="true">目前無法使用</span>
              )}
            </div>
            <p className="mt-4 text-note text-ash">
              想先看看題目？
              <Link href="/compass/try" className="ml-1 underline underline-offset-4 hover:text-ink">不用登入，直接試用</Link>
              （不會儲存作答）
            </p>
          </section>
          <section className="paper-card flex flex-col p-7 md:p-10" data-reveal style={delay(140)}>
            <div className="flex items-start justify-between gap-6">
              <span className="numeral" style={{ background: WASH.sage }} aria-hidden>
                二
              </span>
              <div data-reveal="draw">
                <ChatSketch className="h-24 w-24 md:h-28 md:w-28" />
              </div>
            </div>
            <h2 className="h-section mt-6 tracking-[0.1em]">AI 生涯對談</h2>
            <p className="lede mt-2 text-meta">{aiState.text}</p>
            <p className="prose-airy mt-4 flex-1 text-ash">和 AI 聊聊你現在的狀況，結束時會產生一份報告，並推薦服務與系友。</p>
            {aiState.href && usable && (
              <div className="mt-8">
                <Link href={aiState.href} className="btn-pill">
                  {user ? aiState.cta : "登入後開始"} <Arrow />
                </Link>
              </div>
            )}
          </section>
        </div>

        {last && (
          <p className="mt-10">
            <Link href={`/compass/result/${last.id}`} className="link-arrow">
              查看我上一次的結果 <Arrow />
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}
