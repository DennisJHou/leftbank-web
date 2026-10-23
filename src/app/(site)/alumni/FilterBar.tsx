"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { FIELD_CATEGORIES } from "@/lib/constants";

const SERVICES = [
  { value: "", label: "全部" },
  { value: "question", label: "可線上提問" },
  { value: "coffee", label: "可約 Coffee Chat" },
  { value: "talk", label: "願意回校分享" },
];

export function FilterBar() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [q, setQ] = useState(params.get("q") ?? "");
  const [pending, start] = useTransition();

  const push = (patch: Record<string, string>) => {
    const next = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(patch)) (v ? next.set(k, v) : next.delete(k));
    start(() => router.replace(`${pathname}${next.size ? `?${next}` : ""}`, { scroll: false }));
  };

  // 輸入停頓 300ms 後才搜尋
  useEffect(() => {
    if (q === (params.get("q") ?? "")) return;
    const t = setTimeout(() => push({ q: q.trim() }), 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  const filter = params.get("filter") ?? "";
  return (
    <div className={`rise space-y-5 border-t border-hairline pt-8 transition-opacity ${pending ? "opacity-60" : ""}`} style={{ "--delay": "240ms" } as React.CSSProperties}>
      <div className="flex flex-wrap gap-2" role="toolbar" aria-label="服務篩選">
        {SERVICES.map((s) => (
          <button key={s.value} type="button" aria-pressed={filter === s.value} onClick={() => push({ filter: s.value })} className="chip">
            {s.label}
          </button>
        ))}
      </div>
      <div className="flex flex-col gap-3 md:flex-row">
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="搜尋姓名或職稱"
          aria-label="搜尋姓名或職稱"
          className="input input-pill md:max-w-sm"
        />
        <select value={params.get("field") ?? ""} onChange={(e) => push({ field: e.target.value })} aria-label="領域分類" className="input input-pill md:max-w-[260px]">
          <option value="">所有領域</option>
          {FIELD_CATEGORIES.map((f) => (
            <option key={f} value={f}>{f}</option>
          ))}
        </select>
      </div>
    </div>
  );
}
