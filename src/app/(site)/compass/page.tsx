import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { compassEligibility, getAiSession } from "@/lib/compass";
import { aiAvailability, aiConfig } from "@/lib/ai";
import { one } from "@/lib/db";
import { Arrow, PageHeader } from "@/components/ui";

export const metadata = { title: "職涯羅盤" };

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
    <div className="container-page">
      <PageHeader title="職涯羅盤" />
      {!elig.ok && elig.reason !== "login" && <p className="notice mb-10 max-w-2xl">{elig.reason}</p>}

      <div className="grid border-t border-hairline md:grid-cols-2">
        <section className="flex flex-col border-b border-hairline py-10 md:border-r md:pr-12">
          <h2 className="h-section">生涯決策困難量表</h2>
          <p className="mt-3 flex-1 text-body text-ash">34 題，約 8 分鐘。結果會列出你最主要的困難，並推薦服務與系友。</p>
          <div className="mt-8">
            {usable ? (
              <Link href={startHref("/compass/cddq")} className="btn btn-dark">
                {user ? "開始作答" : "登入後開始"} <Arrow />
              </Link>
            ) : (
              <span className="btn btn-dark" aria-disabled="true">目前無法使用</span>
            )}
          </div>
        </section>
        <section className="flex flex-col border-b border-hairline py-10 md:pl-12">
          <h2 className="h-section">AI 生涯對談</h2>
          <p className="mt-3 flex-1 text-body text-ash">{aiState.text}</p>
          {aiState.href && usable && (
            <div className="mt-8">
              <Link href={aiState.href} className="btn btn-outline">
                {user ? aiState.cta : "登入後開始"} <Arrow />
              </Link>
            </div>
          )}
        </section>
      </div>

      {last && (
        <p className="mt-8">
          <Link href={`/compass/result/${last.id}`} className="link text-meta">查看我上一次的結果</Link>
        </p>
      )}
    </div>
  );
}
