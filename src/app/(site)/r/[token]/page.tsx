import { one } from "@/lib/db";
import { CONTACT_TYPE_LABEL, MEETING_MODE_LABEL, REQUEST_STATUS_LABEL, type ContactType, type RequestStatus } from "@/lib/constants";
import { RespondForm } from "./RespondForm";

export const metadata = { title: "回覆邀請", robots: { index: false } };

export default async function RespondPage({ params, searchParams }: PageProps<"/r/[token]">) {
  const { token } = await params;
  const { action: raw } = await searchParams;
  const action = raw === "decline" ? "decline" : raw === "complete" ? "complete" : "accept";
  const req = await one<{
    type: ContactType;
    status: RequestStatus;
    intro: string;
    questions: string[];
    mode: keyof typeof MEETING_MODE_LABEL | null;
    availability: string | null;
    student_name: string;
    alumni_name: string;
    created_at: Date;
  }>(
    `select r.type, r.status, r.intro, r.questions, r.mode, r.availability, r.created_at,
            s.name as student_name, a.name as alumni_name
       from contact_requests r join users s on s.id = r.from_user join users a on a.id = r.to_user
      where r.token = $1`,
    [token],
  );

  return (
    <div className="container-narrow pt-10 md:pt-16">
      {!req ? (
        <p className="notice notice-error">找不到這筆邀請，請確認連結是否完整。</p>
      ) : (
        <>
          <p className="eyebrow">{CONTACT_TYPE_LABEL[req.type]} · {REQUEST_STATUS_LABEL[req.status]}</p>
          <h1 className="display mt-4 text-[32px] md:text-[42px]">
            {action === "complete"
              ? `和 ${req.student_name} 的${CONTACT_TYPE_LABEL[req.type]}完成了嗎？`
              : `${req.alumni_name}，${req.student_name} 想${req.type === "coffee" ? "約你喝杯咖啡" : "請教你幾個問題"}`}
          </h1>

          <div className="card mt-8 space-y-5 p-6 md:p-8">
            <div>
              <p className="text-[13px] text-ash">自我介紹</p>
              <p className="mt-2 whitespace-pre-line text-[16px] leading-relaxed">{req.intro}</p>
            </div>
            <div>
              <p className="text-[13px] text-ash">問題</p>
              <ol className="mt-2 list-decimal space-y-2 pl-5 text-[16px] leading-relaxed">
                {req.questions.map((q, i) => (
                  <li key={i}>{q}</li>
                ))}
              </ol>
            </div>
            {req.type === "coffee" && (
              <p className="text-[15px] text-stone">
                {MEETING_MODE_LABEL[req.mode ?? "either"]} · {req.availability}
              </p>
            )}
          </div>

          <div className="mt-8">
            <RespondForm token={token} action={action} />
          </div>
          <p className="mt-10 text-[13px] text-ash">
            你不需要登入。這個頁面只有收到邀請信的你能打開；你的 email 不會出現在網站上。
          </p>
        </>
      )}
    </div>
  );
}
