import Link from "next/link";

/** 按鈕與連結裡的箭頭 */
export function Arrow({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.4" className={className} aria-hidden>
      <path d="M3 10h13M11.5 5.5L16 10l-4.5 4.5" strokeLinecap="square" />
    </svg>
  );
}

export function BackLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="inline-flex items-center gap-2 text-meta text-ash hover:text-ink">
      <Arrow className="h-4 w-4 rotate-180" />
      {children}
    </Link>
  );
}

const delay = (ms: number) => ({ "--delay": `${ms}ms` }) as React.CSSProperties;

/** 頁面標題：#小標、加字距的大標題、說明，右邊可以放一張線條插畫。載入時依序浮現 */
export function PageHeader({
  title,
  eyebrow,
  visual,
  children,
}: {
  title: string;
  eyebrow?: string;
  visual?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <header className="grid items-center gap-8 pb-10 pt-12 md:grid-cols-[minmax(0,1fr)_auto] md:gap-16 md:pb-14 md:pt-20">
      <div>
        {eyebrow && (
          <span className="eyebrow rise" style={delay(0)}>
            {eyebrow}
          </span>
        )}
        <h1 className="h-feature rise mt-3" style={delay(80)}>
          {title}
        </h1>
        {children && (
          <div className="prose-airy rise mt-5 max-w-2xl text-ash" style={delay(160)}>
            {children}
          </div>
        )}
      </div>
      {visual && <div className="draw-in mx-auto w-full max-w-[240px] md:max-w-[300px]">{visual}</div>}
    </header>
  );
}

/** 尚未有資料時的佔位區塊 */
export function EmptyState({ title = "資料建置中", children }: { title?: string; children?: React.ReactNode }) {
  return (
    <div className="flex min-h-[220px] flex-col items-center justify-center border border-hairline px-6 py-12 text-center">
      <p className="h-item">{title}</p>
      {children && <div className="mt-3 text-meta text-ash">{children}</div>}
    </div>
  );
}
