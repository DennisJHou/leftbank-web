"use client";

import { useState } from "react";
import { PageHeader } from "@/components/ui";
import { ITEMS, SCALE_INSTRUCTION } from "@/lib/cddq";
import { TrialResult } from "@/components/compass/TrialResult";
import { CddqRunner } from "../cddq/CddqRunner";

/** 不用登入的試用版：同一份題目與計分，作答只留在這個分頁裡，不會送出或儲存 */
export function TryScale() {
  const [items, setItems] = useState<Record<string, number> | null>(null);
  const [round, setRound] = useState(0);

  if (items) {
    return (
      <>
        <PageHeader eyebrow="#試用結果" title="生涯決策困難量表">
          這是你這一次的結果，只存在這個分頁裡，關掉就沒有了。
        </PageHeader>
        <TrialResult
          items={items}
          onRestart={() => {
            setItems(null);
            setRound((r) => r + 1);
            window.scrollTo({ top: 0 });
          }}
        />
      </>
    );
  }

  return (
    <div className="mx-auto max-w-[720px]">
      <PageHeader eyebrow="#試用版" title="生涯決策困難量表">
        {ITEMS.length} 題，約 10 分鐘。{SCALE_INSTRUCTION}不需要登入，作答不會被儲存。
      </PageHeader>
      <CddqRunner key={round} trial consentItems={[]} userId="trial" onTrialDone={setItems} />
    </div>
  );
}
