import Link from "next/link";

export function LogoMark({ className = "h-7 w-7" }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden>
      <circle cx="32" cy="32" r="32" fill="currentColor" />
      <path d="M10 38c7-6 14-6 22 0s15 6 22 0" fill="none" stroke="#f7f1e8" strokeWidth="4" strokeLinecap="round" />
      <path d="M18 30V20h8v10" fill="none" stroke="#ddaa61" strokeWidth="4" strokeLinejoin="round" />
    </svg>
  );
}

export function Logo({ dark = false }: { dark?: boolean }) {
  return (
    <Link href="/" className={`flex items-center gap-2.5 ${dark ? "text-canvas" : "text-stone"}`} aria-label="左岸計畫 首頁">
      <LogoMark />
      <span className="font-serif text-[19px] tracking-[0.12em]">左岸計畫</span>
    </Link>
  );
}
