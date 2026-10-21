"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <div className="flex min-h-[70dvh] flex-col items-center justify-center px-5 text-center">
      <h1 className="h-page">發生錯誤</h1>
      <p className="mt-4 text-body text-ash">請稍後再試一次。如果持續發生，請來信 leftbank.psy@gmail.com。</p>
      <div className="mt-10 flex gap-3">
        <button type="button" onClick={reset} className="btn btn-dark">再試一次</button>
        <Link href="/" className="btn btn-outline">回到首頁</Link>
      </div>
      {error.digest && <p className="mt-6 text-note text-ash">錯誤代碼：{error.digest}</p>}
    </div>
  );
}
