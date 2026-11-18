import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { compassEligibility } from "@/lib/compass";
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
  const last = user
    ? await one<{ id: string }>("select id from compass_sessions where user_id = $1 and status = 'completed' order by created_at desc limit 1", [user.id])
    : null;
  const usable = elig.ok || elig.reason === "login";
  const startHref = (path: string) => (user ? path : `/login?next=${encodeURIComponent(path)}`);

  return (
    <div>
      <ScrollFx />
      <div data-progress className="container-page">
        <PageHeader eyebrow="#找到卡住的地方" title="職涯羅盤" visual={<CompassSketch />}>
          不知道下一步往哪走，常常是因為說不清楚自己卡在哪裡。先做量表找出卡住的地方，再由 AI 助手幫你整理系友的經驗與臺大的資源。
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
                <Link href={startHref("/compass/cddq")} className="btn btn-primary">
                  {user ? "開始作答" : "登入後開始"} <Arrow />
                </Link>
              ) : (
                <span className="btn" aria-disabled="true">目前無法使用</span>
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
            <h2 className="h-section mt-6 tracking-[0.1em]">你的處置包</h2>
            <p className="lede mt-2 text-meta">做完問卷後自動產生・約 1 分鐘</p>
            <p className="prose-airy mt-4 flex-1 text-ash">
              做完問卷，會有一位 AI 助手依你最卡的地方，整理走過類似處境的系友說過的話、適合你的臺大資源，以及這週就能做的一件事。可以存成圖片留著。
            </p>
            <p className="mt-6 text-note text-ash">不需要再輸入任何文字。AI 只會拿到你的分數，不會拿到姓名、學號或 email。</p>
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
