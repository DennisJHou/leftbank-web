import Link from "next/link";
import { InitialsPanel } from "./Avatar";
import { Arrow } from "./ui";
import type { StoryCardData } from "@/lib/queries";

/** 首頁故事卡（參考 Aesop 的商品卡：圖片、名稱、說明、整寬按鈕） */
export function StoryCard({ s }: { s: StoryCardData }) {
  const href = `/alumni/${s.userId}#story`;
  return (
    <article className="flex h-full flex-col">
      <Link href={href} className="block aspect-[4/3] overflow-hidden bg-panel" tabIndex={-1} aria-hidden>
        {s.photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={s.photo} alt="" className="h-full w-full object-cover" />
        ) : (
          <InitialsPanel name={s.name} />
        )}
      </Link>
      <h3 className="h-item mt-5">{s.name}</h3>
      {s.title && <p className="text-meta text-ash">{s.title}</p>}
      <p className="mt-4 flex-1 font-serif text-item leading-[1.7] text-ink">「{s.tagline}」</p>
      <Link href={href} className="btn btn-outline mt-6 w-full">
        閱讀全文 <Arrow />
      </Link>
    </article>
  );
}
