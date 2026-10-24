"use client";

import { useState } from "react";

export function Consent({ items, onAgree, cta, pending }: { items: string[]; onAgree: () => void; cta: string; pending?: boolean }) {
  const [checked, setChecked] = useState(false);
  return (
    <div className="paper-card rise p-6 md:p-10" style={{ "--delay": "240ms" } as React.CSSProperties}>
      <span className="eyebrow">#開始之前</span>
      <h2 className="h-section mt-2 tracking-[0.1em]">資料使用說明</h2>
      <ul className="prose-airy mt-6 space-y-3">
        {items.map((t) => (
          <li key={t} className="flex gap-3">
            <span aria-hidden className="mt-[0.85em] h-1.5 w-1.5 shrink-0 rounded-full bg-river" />
            {t}
          </li>
        ))}
      </ul>
      <label className="mt-8 flex items-center gap-3 text-body">
        <input type="checkbox" checked={checked} onChange={(e) => setChecked(e.target.checked)} className="checkbox" />
        我了解並同意以上的資料使用方式
      </label>
      <button type="button" disabled={!checked || pending} onClick={onAgree} className="btn btn-primary mt-8">
        {pending ? "準備中…" : cta}
      </button>
    </div>
  );
}
