import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { one } from "@/lib/db";
import type { StoryAnswers } from "@/lib/story-questions";
import { StoryEditor } from "./StoryEditor";

export const metadata = { title: "留下你的故事" };

export default async function StoryPage({ searchParams }: PageProps<"/me/story">) {
  const sp = await searchParams;
  const user = await requireUser("/me/story");
  const [story, profile] = await Promise.all([
    one<{ tagline: string; answers: StoryAnswers; status: string }>(
      "select tagline, answers, status from stories where user_id = $1 and campaign_id is null",
      [user.id],
    ),
    one<{ show_in_directory: boolean }>("select show_in_directory from alumni_profiles where user_id = $1", [user.id]),
  ]);

  return (
    <div className="container-narrow pt-12 md:pt-20">
      <h1 className="h-page">留下你的故事</h1>

      <div className="mt-8 space-y-3">
        {sp.saved && (
          <p className="notice notice-ok">
            已發布。<Link href={`/alumni/${user.id}#story`} className="link">查看故事頁</Link>
          </p>
        )}
        {sp.deleted && <p className="notice">故事已刪除。</p>}
        {story?.status === "hidden" && (
          <p className="notice notice-error">這篇故事目前被管理員暫時下架。如有疑問，請來信 leftbank.psy@gmail.com。</p>
        )}
        {user.identity.canBeListed && !profile?.show_in_directory && (
          <p className="notice">
            你目前沒有出現在系友園地，故事不會被看見。<Link href="/me?tab=public" className="link">前往公開設定</Link>
          </p>
        )}
      </div>

      <div className="mt-10">
        {!user.identity.canBeListed ? (
          <div className="card p-8">
            <p className="h-item">故事開放給系友與老師撰寫</p>
            <p className="mt-3 text-meta text-ash">在「我的帳號」補上畢業年後即可撰寫。</p>
          </div>
        ) : user.status !== "active" ? (
          <p className="notice">帳號審核通過後，就可以發布故事。</p>
        ) : (
          <StoryEditor initial={{ tagline: story?.tagline ?? "", answers: story?.answers ?? {} }} hasStory={Boolean(story)} />
        )}
      </div>
    </div>
  );
}
