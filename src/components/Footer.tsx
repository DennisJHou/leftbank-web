import Link from "next/link";
import { LogoMark } from "./Logo";
import { CONTACT_EMAIL } from "@/lib/constants";

export function Footer() {
  return (
    <footer className="mt-28 bg-ink-band text-white md:mt-36">
      <div className="container-page grid gap-12 py-16 md:grid-cols-[1.5fr_1fr_1fr] md:py-20">
        <div>
          <div className="flex items-center gap-3">
            <LogoMark className="h-7 w-7 text-white/20" />
            <span className="font-serif text-[1.375rem] tracking-[0.14em]">左岸計畫</span>
          </div>
          <p className="mt-5 text-meta text-white/70">國立臺灣大學心理學系</p>
        </div>
        <div>
          <p className="text-meta font-medium">網站</p>
          <ul className="mt-2 text-meta text-white/70">
            <li><Link href="/#dilemmas" className="block py-3 hover:text-white">關於計畫</Link></li>
            <li><Link href="/alumni" className="block py-3 hover:text-white">系友園地</Link></li>
            <li><Link href="/compass" className="block py-3 hover:text-white">職涯羅盤</Link></li>
          </ul>
        </div>
        <div>
          <p className="text-meta font-medium">聯絡我們</p>
          <ul className="mt-2 text-meta text-white/70">
            <li><a href={`mailto:${CONTACT_EMAIL}`} className="block py-3 hover:text-white">{CONTACT_EMAIL}</a></li>
            <li className="py-3">臺大心理系館 南館</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10">
        <p className="container-page py-6 text-note text-white/60">© {new Date().getFullYear()} 臺大心理系 左岸計畫</p>
      </div>
    </footer>
  );
}
