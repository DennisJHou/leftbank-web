import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { compassEligibility, CONSENT_TEXT, getAiSession } from "@/lib/compass";
import { aiAvailability, aiConfig, type ChatMessage } from "@/lib/ai";
import { AiChat, StartAi } from "./AiChat";

export const metadata = { title: "AI 生涯對談" };

export default async function AiPage() {
  const user = await requireUser("/compass/ai");
  const elig = compassEligibility(user);
  const session = elig.ok ? await getAiSession(user.id) : null;
  if (session?.status === "completed") redirect(`/compass/result/${session.id}`);
  const availability = await aiAvailability();
  const { maxTurns, mock } = aiConfig();

  let body: React.ReactNode;
  if (!elig.ok) {
    body = <p className="notice">{elig.reason}</p>;
  } else if (session) {
    const messages = (session.answers as { messages: ChatMessage[] }).messages;
    const used = messages.filter((m) => m.role === "user").length;
    body = <AiChat initial={messages} turnsLeft={Math.max(0, maxTurns - used)} maxTurns={maxTurns} />;
  } else if (availability === "open") {
    body = <StartAi consentItems={[...CONSENT_TEXT, `對談最多 ${maxTurns} 輪，每個帳號限用 1 次。對話內容會送到 Anthropic 的 Claude 模型產生回覆。`]} />;
  } else {
    body = (
      <div className="card p-8 text-center">
        <p className="display text-[26px]">{availability === "full" ? "名額已滿" : "即將推出"}</p>
        <p className="mt-3 text-[15px] text-stone">
          {availability === "full" ? "這一期的 AI 對談名額已經用完了。" : "AI 生涯對談還在準備中。"}先試試基礎版的量表吧。
        </p>
        <Link href="/compass/cddq" className="btn btn-stone mt-6">開始基礎版</Link>
      </div>
    );
  }

  return (
    <div className="container-narrow pt-10 md:pt-14">
      <Link href="/compass" className="text-[14px] text-ash hover:text-stone">← 職涯羅盤</Link>
      <p className="eyebrow mt-8">AI 版</p>
      <h1 className="display mt-3 text-[34px] md:text-[44px]">AI 生涯對談</h1>
      {mock && <p className="notice mt-6">開發模式：沒有設定 ANTHROPIC_API_KEY，AI 會用固定的示範回覆。</p>}
      <div className="mt-10">{body}</div>
    </div>
  );
}
