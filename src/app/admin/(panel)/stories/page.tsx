import { requireAdmin } from "@/lib/admin-auth";
import { query } from "@/lib/db";
import { storySections, type StoryAnswers } from "@/lib/story-questions";
import { setStoryStatus } from "../../actions";
import { ConfirmButton } from "../../ConfirmButton";
import { fmtDate, PageTitle } from "../../ui";

export const metadata = { title: "故事管理" };

export default async function StoriesAdmin() {
  await requireAdmin();
  const rows = await query<{
    id: string;
    user_id: string;
    name: string;
    tagline: string;
    answers: StoryAnswers;
    status: "published" | "hidden";
    updated_at: Date;
  }>(
    `select s.id, s.user_id, u.name, s.tagline, s.answers, s.status, s.updated_at
       from stories s join users u on u.id = s.user_id order by s.status desc, s.updated_at desc`,
  );

  return (
    <>
      <PageTitle title="故事管理" lead="故事送出即發布。發現不當內容時可以下架（改成隱藏，作者仍看得到，可以隨時恢復）。" />
      {rows.length === 0 ? (
        <p className="card p-8 text-center text-[14px] text-ash">還沒有任何故事。</p>
      ) : (
        <ul className="space-y-3">
          {rows.map((s) => (
            <li key={s.id} className={`card p-5 ${s.status === "hidden" ? "opacity-70" : ""}`}>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] text-ash">
                    {s.name} · 更新於 {fmtDate(s.updated_at)}
                    {s.status === "hidden" && <span className="chip ml-2 bg-surface-grey">已下架</span>}
                  </p>
                  <p className="mt-1 font-serif text-[18px]">「{s.tagline}」</p>
                </div>
                <div className="flex gap-2">
                  {s.status === "published" ? (
                    <>
                      <a href={`/alumni/${s.user_id}#story`} target="_blank" className="btn btn-sm text-stone">查看</a>
                      <ConfirmButton
                        action={setStoryStatus.bind(null, s.id, "hidden")}
                        confirm={`確定要下架「${s.name}」的故事嗎？`}
                        className="btn btn-outline btn-sm"
                      >
                        下架
                      </ConfirmButton>
                    </>
                  ) : (
                    <ConfirmButton action={setStoryStatus.bind(null, s.id, "published")} className="btn btn-stone btn-sm">
                      恢復
                    </ConfirmButton>
                  )}
                </div>
              </div>
              <details className="mt-3">
                <summary className="cursor-pointer text-[13px] text-stone">展開全文</summary>
                <div className="mt-3 space-y-4 text-[14px] leading-relaxed">
                  {storySections(s.answers).map((sec) => (
                    <div key={sec.key}>
                      <p className="font-medium text-stone">{sec.title}</p>
                      <p className="mt-1 whitespace-pre-line">{sec.body}</p>
                    </div>
                  ))}
                </div>
              </details>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
