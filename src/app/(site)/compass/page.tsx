import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { compassEligibility, getAiSession } from "@/lib/compass";
import { aiAvailability, aiConfig } from "@/lib/ai";
import { one } from "@/lib/db";

export const metadata = { title: "職涯羅盤" };

export default async function CompassPage() {
  const user = await getCurrentUser();
  const elig = compassEligibility(user);
  const [ai, aiSession, last] = await Promise.all([
    aiAvailability(),
    user ? getAiSession(user.id) : null,
    user
      ? one<{ id: string }>(
          "select id from compass_sessions where user_id = $1 and status = 'completed' order by created_at desc limit 1",
          [user.id],
        )
      : null,
  ]);
  const { maxTurns } = aiConfig();

  const startHref = (path: string) => (user ? path : `/login?next=${encodeURIComponent(path)}`);

  let aiState: { label: string; text: string; href?: string; cta?: string };
  if (aiSession?.status === "completed") {
    aiState = { label: "已使用", text: "你已經完成過一次 AI 對談，可以隨時回顧報告。", href: `/compass/result/${aiSession.id}`, cta: "看我的報告" };
  } else if (aiSession?.status === "in_progress") {
    aiState = { label: "進行中", text: "你有一場還沒結束的對談。", href: "/compass/ai", cta: "繼續對談" };
  } else if (ai === "open") {
    aiState = {
      label: "宣傳期免費",
      text: `和 AI 聊聊你的處境，最多 ${maxTurns} 輪。結束後會產生一份報告，並推薦適合的系友。每個帳號限用 1 次。`,
      href: startHref("/compass/ai"),
      cta: "開始對談",
    };
  } else if (ai === "full") {
    aiState = { label: "名額已滿", text: "這一期的 AI 對談名額已經用完了，謝謝大家的熱情。可以先試試基礎版。" };
  } else {
    aiState = { label: "即將推出", text: "和 AI 聊聊你的處境，由 AI 評估你的生涯狀態、推薦服務與系友。敬請期待。" };
  }

  return (
    <div className="container-page pt-10 md:pt-16">
      <p className="eyebrow">職涯羅盤</p>
      <h1 className="display mt-4 max-w-3xl text-[38px] md:text-[60px]">先找到自己卡在哪裡，再決定往哪裡走</h1>
      <p className="mt-5 max-w-xl text-[17px] leading-relaxed text-stone">
        羅盤不會告訴你答案，但能指出你目前最需要的是什麼——更多準備、更多資訊，還是理清彼此拉扯的想法——並推薦最能幫上忙的左岸服務與系友。
      </p>

      {!elig.ok && elig.reason !== "login" && <p className="notice mt-8 max-w-2xl">{elig.reason}</p>}
      {last && (
        <p className="mt-6 text-[15px]">
          <Link href={`/compass/result/${last.id}`} className="link">看我上一次的結果 →</Link>
        </p>
      )}

      <div className="mt-12 grid gap-5 md:grid-cols-2">
        <div className="card flex flex-col p-7 md:p-9">
          <div className="flex items-center justify-between">
            <p className="eyebrow">基礎版</p>
            <span className="chip">免費</span>
          </div>
          <h2 className="display mt-5 text-[30px]">生涯決策困難量表</h2>
          <p className="mt-3 flex-1 text-[15px] leading-relaxed text-stone">
            34 題，大約 7–8 分鐘。結果會用雷達圖呈現 10 個面向，告訴你最主要的 2–3 個困難。可以重測，看看自己的變化。
          </p>
          <div className="mt-8">
            {elig.ok || elig.reason === "login" ? (
              <Link href={startHref("/compass/cddq")} className="btn btn-stone">{user ? "開始作答" : "登入後開始"}</Link>
            ) : (
              <span className="btn btn-stone" aria-disabled="true">目前無法使用</span>
            )}
          </div>
        </div>

        <div className="flex flex-col rounded-card bg-[#efe4d3] p-7 md:p-9">
          <div className="flex items-center justify-between">
            <p className="eyebrow">AI 版</p>
            <span className="chip bg-canvas">{aiState.label}</span>
          </div>
          <h2 className="display mt-5 text-[30px]">AI 生涯對談</h2>
          <p className="mt-3 flex-1 text-[15px] leading-relaxed text-stone">{aiState.text}</p>
          {aiState.href && (elig.ok || elig.reason === "login") && (
            <div className="mt-8">
              <Link href={aiState.href} className="btn btn-outline">{user ? aiState.cta : "登入後開始"}</Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
