"use client";

import { useState } from "react";

export function Consent({ items, onAgree, cta, pending }: { items: string[]; onAgree: () => void; cta: string; pending?: boolean }) {
  const [checked, setChecked] = useState(false);
  return (
    <div className="card p-6 md:p-8">
      <p className="eyebrow">開始之前</p>
      <h2 className="display mt-3 text-[26px]">關於你的資料</h2>
      <ul className="mt-5 space-y-3 text-[15px] leading-relaxed text-stone">
        {items.map((t) => (
          <li key={t} className="flex gap-3">
            <span aria-hidden className="mt-[9px] h-1.5 w-1.5 shrink-0 rounded-full bg-ochre" />
            {t}
          </li>
        ))}
      </ul>
      <label className="mt-6 flex items-center gap-3 text-[15px]">
        <input type="checkbox" checked={checked} onChange={(e) => setChecked(e.target.checked)} className="h-4 w-4 accent-[#4a4741]" />
        我了解並同意以上的資料使用方式
      </label>
      <button type="button" disabled={!checked || pending} onClick={onAgree} className="btn btn-stone mt-6 w-full md:w-auto">
        {pending ? "準備中…" : cta}
      </button>
    </div>
  );
}
