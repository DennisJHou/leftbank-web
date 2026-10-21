"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <div className="flex min-h-[70dvh] flex-col items-center justify-center px-4 text-center">
      <p className="eyebrow">發生錯誤</p>
      <h1 className="display mt-3 text-[34px] md:text-[44px]">抱歉，出了一點問題</h1>
      <p className="mt-4 text-[16px] text-stone">請稍後再試一次。如果一直發生，歡迎來信 leftbank.psy@gmail.com 告訴我們。</p>
      <div className="mt-8 flex gap-3">
        <button type="button" onClick={reset} className="btn btn-stone">再試一次</button>
        <Link href="/" className="btn btn-outline">回到首頁</Link>
      </div>
      {error.digest && <p className="mt-6 text-[12px] text-mute">錯誤代碼：{error.digest}</p>}
    </div>
  );
}
