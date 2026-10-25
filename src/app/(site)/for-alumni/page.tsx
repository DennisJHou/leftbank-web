import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { DAILY_REQUEST_LIMIT, RESPONSE_DAYS } from "@/lib/constants";
import { STORY_MIN_ANSWERS, STORY_SUGGESTED } from "@/lib/story-questions";
import { Arrow, PageHeader } from "@/components/ui";
import { ScrollFx } from "@/components/ScrollFx";
import { CoffeeSketch } from "@/components/art/CoffeeSketch";

export const metadata = { title: "給系友" };

const delay = (ms: number) => ({ "--delay": `${ms}ms` }) as React.CSSProperties;

const PROMISES = [
  {
    title: "要花多少時間",
    text: `寫故事（選填，沒寫也能完成註冊、出現在系友園地）：九題裡任選至少 ${STORY_MIN_ANSWERS} 題回答，每題建議 ${STORY_SUGGESTED.min}–${STORY_SUGGESTED.max} 字，之後可以隨時修改或刪除。線上提問：回一封信。Coffee Chat：見一次面。每一項都能單獨開關，沒開放的項目，學生就看不到聯絡按鈕。`,
  },
  {
    title: "信箱不會外露",
    text: "你的信箱不會出現在網站上。學生的申請由網站轉寄給你，照片、職稱、公司、屆別也都能逐項決定要不要公開。",
  },
  {
    title: "可以婉拒，也不會被淹沒",
    text: `信裡有「我會聯絡他」「這次先婉拒」兩個按鈕，不用登入，點一下就好。${RESPONSE_DAYS} 天內沒有回應，申請會自動結束並通知學生。每位學生一天最多送出 ${DAILY_REQUEST_LIMIT} 則，同一位學生對你同時只能有一筆進行中的申請。`,
  },
];

export default async function ForAlumniPage() {
  const user = await getCurrentUser();
  return (
    <div>
      <ScrollFx />
      <div className="container-page">
        <PageHeader eyebrow="#給系友" title="參與多少，由你決定。" visual={<CoffeeSketch />}>
          學弟妹想聽的，是你走過的路。我們把你的負擔放到最小，每一步都可以隨時調整或收回。
        </PageHeader>

        <ul className="max-w-3xl divide-y divide-hairline border-y border-hairline">
          {PROMISES.map((p, i) => (
            <li key={p.title} className="py-7 md:py-9" data-reveal style={delay(i * 120)}>
              <h2 className="h-item tracking-[0.12em]">{p.title}</h2>
              <p className="prose-airy mt-2 text-ash">{p.text}</p>
            </li>
          ))}
        </ul>

        <div className="mt-12 flex flex-wrap items-center gap-x-6 gap-y-4 pb-8" data-reveal>
          {user ? (
            <>
              <Link href="/me/story" className="btn btn-primary">
                留下我的故事 <Arrow />
              </Link>
              <Link href="/me" className="link-arrow">
                調整我的公開設定 <Arrow />
              </Link>
            </>
          ) : (
            <>
              <Link href="/signup?as=alumni" className="btn btn-primary">
                以系友身分加入 <Arrow />
              </Link>
              <p className="text-meta text-ash">
                已經有帳號了？ <Link href="/login?next=%2Fme%2Fstory" className="link">登入</Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
