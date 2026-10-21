import Link from "next/link";

export function LogoMark({ className = "h-7 w-7" }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden>
      <rect width="64" height="64" fill="currentColor" />
      <path d="M10 38c7-6 14-6 22 0s15 6 22 0" fill="none" stroke="#fffef2" strokeWidth="4" strokeLinecap="square" />
      <path d="M18 30V20h8v10" fill="none" stroke="#ddaa61" strokeWidth="4" />
    </svg>
  );
}

export function Logo({ dark = false }: { dark?: boolean }) {
  return (
    <Link href="/" className={`flex items-center gap-3 ${dark ? "text-canvas" : "text-ink-strong"}`} aria-label="左岸計畫 首頁">
      <LogoMark className="h-7 w-7" />
      <span className="font-serif text-[1.375rem] tracking-[0.14em]">左岸計畫</span>
    </Link>
  );
}
