import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { compassEligibility, CONSENT_TEXT, getAiSession } from "@/lib/compass";
import { aiAvailability, aiConfig, type ChatMessage } from "@/lib/ai";
import { BackLink, EmptyState, PageHeader } from "@/components/ui";
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
    body = <StartAi consentItems={[...CONSENT_TEXT, `對談最多 ${maxTurns} 輪，每個帳號限用一次。對話內容會送到 Anthropic 的 Claude 模型產生回覆。`]} />;
  } else {
    body = (
      <EmptyState title={availability === "full" ? "名額已滿" : "即將推出"}>
        <Link href="/compass/cddq" className="link">改用生涯決策困難量表</Link>
      </EmptyState>
    );
  }

  return (
    <div>
      <div className="container-narrow pt-10">
        <BackLink href="/compass">職涯羅盤</BackLink>
        <PageHeader eyebrow="#職涯羅盤" title="AI 生涯對談">
          想到什麼就說什麼。聊完之後，會整理成一份報告。
        </PageHeader>
        {mock && <p className="notice mb-8">開發模式：未設定 ANTHROPIC_API_KEY，AI 以固定回覆代替。</p>}
        {body}
      </div>
    </div>
  );
}
