import Link from "next/link";

/** 按鈕與連結裡的箭頭（參考 Aesop 的「Explore the story →」） */
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

/** 頁面標題（每頁最大的字） */
export function PageHeader({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <header className="pb-10 pt-12 md:pb-14 md:pt-20">
      <h1 className="h-page">{title}</h1>
      {children && <div className="mt-4 max-w-2xl text-body text-ash">{children}</div>}
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
