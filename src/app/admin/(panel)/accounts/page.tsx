import Link from "next/link";
import { requireAdmin } from "@/lib/admin-auth";
import { query } from "@/lib/db";
import { deriveIdentity, educationLine, identityLabels, type Education } from "@/lib/identity";
import { approveUser, restoreUser, suspendUser } from "../../actions";
import { ConfirmButton } from "../../ConfirmButton";
import { fmtDate, PageTitle, Table, Td, Th } from "../../ui";

export const metadata = { title: "帳號管理" };

const TABS = [
  { key: "pending", label: "待審核" },
  { key: "all", label: "全部" },
  { key: "suspended", label: "已停用" },
  { key: "unverified", label: "未驗證 email" },
] as const;

type Row = {
  id: string;
  name: string;
  email: string;
  status: string;
  role_teacher: boolean;
  teacher_verified: boolean;
  email_verified_at: Date | null;
  created_at: Date;
  education: Education[] | null;
  dup: string[] | null;
};

export default async function AccountsPage({ searchParams }: PageProps<"/admin/accounts">) {
  await requireAdmin();
  const sp = await searchParams;
  const tab = TABS.some((t) => t.key === sp.tab) ? (sp.tab as (typeof TABS)[number]["key"]) : "pending";
  const q = typeof sp.q === "string" ? sp.q.trim().slice(0, 50) : "";

  const where: string[] = [];
  if (tab === "pending") {
    where.push("u.email_verified_at is not null and u.status <> 'suspended' and (u.status = 'pending' or (u.role_teacher and not u.teacher_verified))");
  }
  if (tab === "suspended") where.push("u.status = 'suspended'");
  if (tab === "unverified") where.push("u.email_verified_at is null");
  if (tab === "all") where.push("u.email_verified_at is not null");
  const params: unknown[] = [];
  if (q) {
    params.push(`%${q}%`);
    where.push(`(u.name ilike $1 or u.email ilike $1 or exists (select 1 from education e2 where e2.user_id = u.id and e2.student_no ilike $1))`);
  }

  const rows = await query<Row>(
    `select u.id, u.name, u.email, u.status, u.role_teacher, u.teacher_verified, u.email_verified_at, u.created_at,
            (select json_agg(json_build_object('id', e.id, 'degree', e.degree, 'student_no', e.student_no,
                    'entry_year', e.entry_year, 'grad_year', e.grad_year) order by e.degree, e.entry_year)
               from education e where e.user_id = u.id) as education,
            (select array_agg(distinct e.student_no) from education e
              where e.user_id = u.id and e.student_no is not null
                and exists (select 1 from education o where o.student_no = e.student_no and o.user_id <> u.id)) as dup
       from users u
      where ${where.join(" and ")}
      order by u.created_at desc
      limit 300`,
    params,
  );

  return (
    <>
      <PageTitle title="帳號管理" lead="審核教師與沒有學號的系友；發現冒充時可以停用帳號。標示「學號重複」代表同一個學號被不同帳號使用。" />
      <div className="mb-5 flex flex-wrap items-center gap-2">
        {TABS.map((t) => (
          <Link key={t.key} href={`/admin/accounts?tab=${t.key}`} aria-current={tab === t.key} className="pill">
            {t.label}
          </Link>
        ))}
        <form className="ml-auto" action="/admin/accounts">
          <input type="hidden" name="tab" value={tab} />
          <input name="q" defaultValue={q} placeholder="搜尋姓名、email、學號" className="input !min-h-[40px] w-60 !py-1.5 text-[14px]" />
        </form>
      </div>

      {rows.length === 0 ? (
        <p className="card p-8 text-center text-[14px] text-ash">{tab === "pending" ? "目前沒有待審核的帳號。" : "沒有符合的帳號。"}</p>
      ) : (
        <Table>
          <thead>
            <tr>
              <Th>姓名／email</Th>
              <Th>身分</Th>
              <Th>學歷</Th>
              <Th>狀態</Th>
              <Th>註冊</Th>
              <Th />
            </tr>
          </thead>
          <tbody>
            {rows.map((u) => {
              const edu = u.education ?? [];
              const id = deriveIdentity(edu, u.role_teacher, u.teacher_verified);
              const needsReview = u.status === "pending" || (u.role_teacher && !u.teacher_verified);
              return (
                <tr key={u.id}>
                  <Td>
                    <p className="font-medium">{u.name}</p>
                    <p className="text-[13px] text-ash">{u.email}</p>
                  </Td>
                  <Td>
                    <div className="flex flex-wrap gap-1">
                      {identityLabels(id).map((l) => (
                        <span key={l} className="chip">{l}</span>
                      ))}
                      {id.teacherPending && <span className="chip bg-gold-pale/60">老師待審</span>}
                    </div>
                  </Td>
                  <Td className="text-[13px]">
                    {edu.length ? (
                      edu.map((e) => (
                        <p key={e.id}>
                          {educationLine(e).replace("臺大心理系 ", "")}
                          <span className={e.student_no ? "ml-2 tabular-nums text-stone" : "ml-2 text-ash"}>{e.student_no ?? "無學號"}</span>
                        </p>
                      ))
                    ) : (
                      <span className="text-ash">—</span>
                    )}
                    {u.dup?.length ? <p className="mt-1 font-medium text-error">⚠ 學號重複：{u.dup.join("、")}</p> : null}
                  </Td>
                  <Td>
                    {!u.email_verified_at ? (
                      <span className="chip">未驗證</span>
                    ) : u.status === "active" ? (
                      <span className="chip bg-sage-pale text-forest">啟用</span>
                    ) : u.status === "pending" ? (
                      <span className="chip bg-gold-pale/60 text-gold-deep">待審核</span>
                    ) : (
                      <span className="chip bg-surface-grey text-ash">停用</span>
                    )}
                  </Td>
                  <Td className="whitespace-nowrap text-[13px] text-ash">{fmtDate(u.created_at)}</Td>
                  <Td>
                    <div className="flex justify-end gap-2">
                      {needsReview && u.status !== "suspended" && u.email_verified_at && (
                        <ConfirmButton action={approveUser.bind(null, u.id)} className="btn btn-stone btn-sm">
                          審核通過
                        </ConfirmButton>
                      )}
                      {u.status === "suspended" ? (
                        <ConfirmButton action={restoreUser.bind(null, u.id)}>恢復</ConfirmButton>
                      ) : (
                        <ConfirmButton
                          action={suspendUser.bind(null, u.id)}
                          confirm={`確定要停用「${u.name}」的帳號嗎？對方會立即被登出，並從系友園地消失。`}
                          className="btn btn-sm text-ash hover:text-error"
                        >
                          停用
                        </ConfirmButton>
                      )}
                    </div>
                  </Td>
                </tr>
              );
            })}
          </tbody>
        </Table>
      )}
    </>
  );
}
