import Link from "next/link";
import { NameCard } from "./NameCard";
import { Arrow } from "./ui";
import type { StoryCardData } from "@/lib/queries";

/** 首頁故事卡（參考 justfont）：照片或名帖、姓名職稱、楷體引言、文字連結；捲進畫面時依序浮現 */
export function StoryCard({ s, index = 0 }: { s: StoryCardData; index?: number }) {
  const href = `/alumni/${s.userId}#story`;
  return (
    <article className="group flex h-full flex-col" data-reveal style={{ "--delay": `${index * 140}ms` } as React.CSSProperties}>
      <Link href={href} className="block aspect-[5/4] overflow-hidden ring-1 ring-hairline" tabIndex={-1} aria-hidden>
        <div className="h-full w-full transition-transform duration-700 ease-out group-hover:scale-[1.04]">
          {s.photo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={s.photo} alt="" className="h-full w-full object-cover" />
          ) : (
            <NameCard name={s.name} />
          )}
        </div>
      </Link>
      <div className="mt-6 flex flex-wrap items-baseline gap-x-3">
        <h3 className="h-item tracking-[0.12em]">{s.name}</h3>
        {s.title && <p className="text-note tracking-[0.04em] text-ash">{s.title}</p>}
      </div>
      <p className="mt-3 flex-1 font-kai text-[1.1875rem] leading-[1.85] tracking-[0.04em] text-ink-strong">「{s.tagline}」</p>
      <Link href={href} className="link-arrow mt-5">
        閱讀全文 <Arrow />
      </Link>
    </article>
  );
}
