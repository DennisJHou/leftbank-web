import { requireUser } from "@/lib/auth";
import { compassEligibility, CONSENT_TEXT } from "@/lib/compass";
import { BackLink, PageHeader } from "@/components/ui";
import { ITEMS, SCALE_INSTRUCTION } from "@/lib/cddq";
import { CddqRunner } from "./CddqRunner";

export const metadata = { title: "生涯決策困難量表" };

export default async function CddqPage() {
  const user = await requireUser("/compass/cddq");
  const elig = compassEligibility(user);
  return (
    <div className="paper-grid paper-page">
      <div className="container-narrow pt-10">
        <BackLink href="/compass">職涯羅盤</BackLink>
        <PageHeader eyebrow="#職涯羅盤" title="生涯決策困難量表">
          {ITEMS.length} 題，約 10 分鐘。{SCALE_INSTRUCTION}
        </PageHeader>
        {elig.ok ? <CddqRunner consentItems={CONSENT_TEXT} userId={user.id} /> : <p className="notice">{elig.reason}</p>}
        <p className="mt-16 text-note text-ash">題目取自田秀蘭「生涯決定困難問卷」（Gati 等人 CDDQ 的中文版）。使用授權確認中。</p>
      </div>
    </div>
  );
}
