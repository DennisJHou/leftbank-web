import Link from "next/link";
import { getCurrentUser, requireUser } from "@/lib/auth";
import { compassEligibility, CONSENT_TEXT } from "@/lib/compass";
import { CddqRunner } from "./CddqRunner";

export const metadata = { title: "生涯決策困難量表" };

export default async function CddqPage() {
  await requireUser("/compass/cddq");
  const elig = compassEligibility(await getCurrentUser());
  return (
    <div className="container-narrow pt-10 md:pt-14">
      <Link href="/compass" className="text-[14px] text-ash hover:text-stone">← 職涯羅盤</Link>
      <div className="mt-8">
        {elig.ok ? (
          <CddqRunner consentItems={CONSENT_TEXT} />
        ) : (
          <p className="notice">{elig.reason}</p>
        )}
      </div>
      <p className="mt-16 text-[12px] leading-relaxed text-mute">
        本量表依照 Gati 生涯決策困難問卷（CDDQ）的架構編製，目前為試行版題目。每一題請依照「這句話有多像現在的你」作答，沒有對錯。
      </p>
    </div>
  );
}
