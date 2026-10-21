import Link from "next/link";
import { LogoMark } from "./Logo";
import { CONTACT_EMAIL } from "@/lib/constants";

export function Footer() {
  return (
    <footer className="mt-24 bg-ink-band text-white md:mt-32">
      <div className="container-page grid gap-10 py-14 md:grid-cols-[1.4fr_1fr_1fr] md:py-20">
        <div>
          <div className="flex items-center gap-2.5 text-canvas">
            <LogoMark />
            <span className="font-serif text-[19px] tracking-[0.12em]">左岸計畫</span>
          </div>
          <p className="mt-5 max-w-sm text-[15px] leading-relaxed text-mute">
            國立臺灣大學心理學系．以對話作為方法，串起系友、學生與系上。
          </p>
        </div>
        <div>
          <p className="eyebrow text-mute">探索</p>
          <ul className="mt-4 space-y-2.5 text-[15px]">
            <li><Link href="/#about" className="hover:text-gold-pale">關於計畫</Link></li>
            <li><Link href="/alumni" className="hover:text-gold-pale">系友園地</Link></li>
            <li><Link href="/compass" className="hover:text-gold-pale">職涯羅盤</Link></li>
          </ul>
        </div>
        <div>
          <p className="eyebrow text-mute">聯絡我們</p>
          <ul className="mt-4 space-y-2.5 text-[15px]">
            <li><a href={`mailto:${CONTACT_EMAIL}`} className="hover:text-gold-pale">{CONTACT_EMAIL}</a></li>
            <li className="text-mute">臺大心理系館 南館</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10">
        <p className="container-page py-6 text-[13px] text-mute">© {new Date().getFullYear()} 臺大心理系 左岸計畫</p>
      </div>
    </footer>
  );
}
