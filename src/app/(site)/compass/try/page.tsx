import { BackLink } from "@/components/ui";
import { ScrollFx } from "@/components/ScrollFx";
import { TryScale } from "./TryScale";

export const metadata = { title: "生涯決策困難量表（試用）", robots: { index: false, follow: false } };

export default function TryPage() {
  return (
    <div>
      <ScrollFx />
      <div className="container-page pt-10">
        <BackLink href="/compass">職涯羅盤</BackLink>
        <TryScale />
        <p className="mt-16 max-w-2xl text-note text-ash">
          題目取自田秀蘭「生涯決定困難問卷」（Gati 等人 CDDQ 的中文版），使用授權確認中，目前只供授權審閱。
          這不是心理診斷。如果你最近感到很大的壓力，歡迎找臺大學生心理健康中心聊聊，或撥打 24 小時安心專線 1925。
        </p>
      </div>
    </div>
  );
}
