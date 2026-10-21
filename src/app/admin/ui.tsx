/** 後台共用的小元件 */
export function PageTitle({ title, lead, children }: { title: string; lead?: string; children?: React.ReactNode }) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="display text-[30px] md:text-[38px]">{title}</h1>
        {lead && <p className="mt-2 text-[14px] text-ash">{lead}</p>}
      </div>
      {children}
    </div>
  );
}

export function Stat({ label, value, sub }: { label: string; value: React.ReactNode; sub?: string }) {
  return (
    <div className="card p-5">
      <p className="text-[13px] text-ash">{label}</p>
      <p className="mt-2 font-sans text-[30px] font-medium tabular-nums leading-none text-ink">{value}</p>
      {sub && <p className="mt-2 text-[12px] text-ash">{sub}</p>}
    </div>
  );
}

export function Table({ children }: { children: React.ReactNode }) {
  return (
    <div className="card overflow-x-auto">
      <table className="w-full min-w-[640px] text-left text-[14px]">{children}</table>
    </div>
  );
}

export function Th({ children, className = "" }: { children?: React.ReactNode; className?: string }) {
  return <th className={`border-b border-hairline px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-ash ${className}`}>{children}</th>;
}

export function Td({ children, className = "" }: { children?: React.ReactNode; className?: string }) {
  return <td className={`border-b border-hairline px-4 py-3 align-top ${className}`}>{children}</td>;
}

/** 數量的橫條（同一個色相，量越大越長），數字一律用文字標示 */
export function BarRow({ label, value, max, suffix = "" }: { label: string; value: number; max: number; suffix?: string }) {
  return (
    <div className="grid grid-cols-[7.5rem_1fr_3.5rem] items-center gap-3 text-[14px]">
      <span className="truncate text-stone">{label}</span>
      <span className="h-2.5 rounded-full bg-[#efe4d3]">
        <span className="block h-full rounded-full bg-[#9a5f17]" style={{ width: `${max ? Math.max(2, (value / max) * 100) : 0}%` }} />
      </span>
      <span className="text-right tabular-nums text-ink">
        {value}
        {suffix}
      </span>
    </div>
  );
}

export const fmtDate = (d: Date | string | null) =>
  d ? new Date(d).toLocaleDateString("zh-TW", { year: "numeric", month: "2-digit", day: "2-digit" }) : "—";
export const fmtDateTime = (d: Date | string | null) =>
  d ? new Date(d).toLocaleString("zh-TW", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }) : "—";
