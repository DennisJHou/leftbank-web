import { requireUser } from "@/lib/auth";
import { compassEligibility, CONSENT_TEXT } from "@/lib/compass";
import { BackLink, PageHeader } from "@/components/ui";
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
          34 題，約 8 分鐘。每一題依「這句話有多像你」選 1 到 9。
        </PageHeader>
        {elig.ok ? <CddqRunner consentItems={CONSENT_TEXT} userId={user.id} /> : <p className="notice">{elig.reason}</p>}
        <p className="mt-16 text-note text-ash">題目為試行版，依 Gati 生涯決策困難問卷（CDDQ）的架構編製。</p>
      </div>
    </div>
  );
}
