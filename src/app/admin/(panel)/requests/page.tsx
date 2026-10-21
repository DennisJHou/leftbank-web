import Link from "next/link";
import { requireAdmin } from "@/lib/admin-auth";
import { query } from "@/lib/db";
import { CONTACT_TYPE_LABEL, MEETING_MODE_LABEL, REQUEST_STATUS_LABEL, type ContactType, type RequestStatus } from "@/lib/constants";
import { fmtDate, PageTitle, Table, Td, Th } from "../../ui";
import { SweepButton } from "./SweepButton";

export const metadata = { title: "提問與咖啡" };

const STATUSES: (RequestStatus | "")[] = ["", "pending", "accepted", "completed", "declined", "overdue"];

export default async function RequestsAdmin({ searchParams }: PageProps<"/admin/requests">) {
  await requireAdmin();
  const sp = await searchParams;
  const status = STATUSES.includes(sp.status as RequestStatus) ? (sp.status as RequestStatus) : "";
  const type = sp.type === "question" || sp.type === "coffee" ? sp.type : "";
  const where: string[] = ["true"];
  const params: unknown[] = [];
  if (status) {
    params.push(status);
    where.push(`r.status = $${params.length}`);
  }
  if (type) {
    params.push(type);
    where.push(`r.type = $${params.length}`);
  }
  const rows = await query<{
    id: string;
    type: ContactType;
    status: RequestStatus;
    created_at: Date;
    responded_at: Date | null;
    completed_at: Date | null;
    student: string;
    alumni: string;
    alumni_id: string;
    intro: string;
    questions: string[];
    mode: keyof typeof MEETING_MODE_LABEL | null;
    availability: string | null;
  }>(
    `select r.id, r.type, r.status, r.created_at, r.responded_at, r.completed_at, r.intro, r.questions, r.mode, r.availability,
            s.name as student, a.name as alumni, a.id as alumni_id
       from contact_requests r join users s on s.id = r.from_user join users a on a.id = r.to_user
      where ${where.join(" and ")}
      order by r.created_at desc limit 500`,
    params,
  );
  const link = (patch: Record<string, string>) => {
    const p = new URLSearchParams({ ...(status && { status }), ...(type && { type }), ...patch });
    for (const [k, v] of [...p.entries()]) if (!v) p.delete(k);
    return `/admin/requests${p.size ? `?${p}` : ""}`;
  };

  return (
    <>
      <PageTitle title="提問與咖啡" lead="系友 14 天沒有回應會自動改成逾期（每天排程檢查一次），並通知學生。">
        <SweepButton />
      </PageTitle>
      <div className="tabs mb-4">
        {STATUSES.map((s) => (
          <Link key={s || "all"} href={link({ status: s })} aria-current={status === s} className="tab">
            {s ? REQUEST_STATUS_LABEL[s] : "全部狀態"}
          </Link>
        ))}
      </div>
      <div className="tabs mb-8">
        {(["", "question", "coffee"] as const).map((t) => (
          <Link key={t || "all"} href={link({ type: t })} aria-current={type === t} className="tab">
            {t ? CONTACT_TYPE_LABEL[t] : "全部類型"}
          </Link>
        ))}
      </div>
      {rows.length === 0 ? (
        <p className="card p-8 text-center text-meta text-ash">沒有符合的紀錄。</p>
      ) : (
        <Table>
          <thead>
            <tr>
              <Th>送出</Th>
              <Th>類型</Th>
              <Th>學生 → 系友</Th>
              <Th>狀態</Th>
              <Th>回應</Th>
              <Th>完成</Th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className={r.status === "overdue" ? "bg-[#fbefea]" : ""}>
                <Td className="whitespace-nowrap text-note">{fmtDate(r.created_at)}</Td>
                <Td className="whitespace-nowrap">{CONTACT_TYPE_LABEL[r.type]}</Td>
                <Td>
                  <p>
                    {r.student} → <a href={`/alumni/${r.alumni_id}`} target="_blank" className="hover:underline">{r.alumni}</a>
                  </p>
                  <details className="mt-1">
                    <summary className="cursor-pointer text-note text-ash">內容</summary>
                    <p className="mt-2 whitespace-pre-line text-note text-stone">{r.intro}</p>
                    <ol className="mt-2 list-decimal pl-5 text-note">
                      {r.questions.map((q, i) => (
                        <li key={i}>{q}</li>
                      ))}
                    </ol>
                    {r.type === "coffee" && (
                      <p className="mt-2 text-note text-ash">{MEETING_MODE_LABEL[r.mode ?? "either"]} · {r.availability}</p>
                    )}
                  </details>
                </Td>
                <Td>
                  <span className={`tag ${r.status === "overdue" ? "tag-error" : ""}`}>{REQUEST_STATUS_LABEL[r.status]}</span>
                </Td>
                <Td className="whitespace-nowrap text-note text-ash">{fmtDate(r.responded_at)}</Td>
                <Td className="whitespace-nowrap text-note text-ash">{fmtDate(r.completed_at)}</Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </>
  );
}
