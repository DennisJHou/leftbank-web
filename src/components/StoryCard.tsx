import Link from "next/link";
import { Avatar } from "./Avatar";
import type { StoryCardData } from "@/lib/queries";

export function StoryCard({ s }: { s: StoryCardData }) {
  return (
    <article className="card flex h-full flex-col p-6 md:p-7">
      <p className="display flex-1 text-[22px] leading-[1.45] text-ink md:text-[24px]">「{s.tagline}」</p>
      <div className="mt-8 flex items-center gap-3">
        <Avatar name={s.name} src={s.photo} size={52} />
        <div className="min-w-0">
          <p className="font-medium">{s.name}</p>
          {s.title && <p className="truncate text-[14px] text-ash">{s.title}</p>}
        </div>
      </div>
      <Link href={`/alumni/${s.userId}#story`} className="mt-6 inline-flex items-center gap-1 text-[15px] font-medium text-stone hover:underline">
        閱讀全文 <span aria-hidden>→</span>
      </Link>
    </article>
  );
}
