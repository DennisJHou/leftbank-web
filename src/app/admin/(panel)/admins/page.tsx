import { requireAdmin, envSuperAdmin } from "@/lib/admin-auth";
import { query } from "@/lib/db";
import { deleteAdminAccount, unlockAdminAccount } from "../../actions";
import { ConfirmButton } from "../../ConfirmButton";
import { fmtDate, PageTitle, Table, Td, Th } from "../../ui";
import { CreateAdminForm, ResetPasswordForm } from "./AdminForms";

export const metadata = { title: "後台帳號" };

export default async function AdminsPage() {
  const me = await requireAdmin("super");
  const envEmail = envSuperAdmin()?.email;
  const rows = await query<{
    id: string;
    email: string;
    name: string;
    level: "super" | "admin";
    locked: boolean;
    failed_attempts: number;
    created_at: Date;
    has_password: boolean;
  }>(
    `select id, email, name, level, failed_attempts, created_at, password_hash is not null as has_password,
            coalesce(locked_until > now(), false) as locked
       from admin_accounts order by level desc, created_at`,
  );

  return (
    <div className="max-w-4xl space-y-10">
      <PageTitle title="後台帳號" lead="系辦、系主任都是「管理員」。只有超級管理員能新增帳號、看個人的羅盤結果。" />
      <Table>
        <thead>
          <tr>
            <Th>帳號</Th>
            <Th>權限</Th>
            <Th>建立</Th>
            <Th />
          </tr>
        </thead>
        <tbody>
          {rows.map((a) => {
            const isEnv = a.email === envEmail;
            return (
              <tr key={a.id}>
                <Td>
                  <p className="font-medium">{a.name}</p>
                  <p className="text-[13px] text-ash">{a.email}</p>
                  {a.locked && <p className="mt-1 text-[12px] text-error">登入失敗過多，鎖定中</p>}
                  {!isEnv && a.has_password && a.id !== me.id && <ResetPasswordForm id={a.id} />}
                </Td>
                <Td>
                  {a.level === "super" ? "超級管理員" : "管理員"}
                  {isEnv && <span className="chip ml-2">環境變數</span>}
                  {a.id === me.id && <span className="chip ml-2">你</span>}
                </Td>
                <Td className="text-[13px] text-ash">{fmtDate(a.created_at)}</Td>
                <Td>
                  <div className="flex justify-end gap-2">
                    {a.locked && <ConfirmButton action={unlockAdminAccount.bind(null, a.id)}>解除鎖定</ConfirmButton>}
                    {!isEnv && a.id !== me.id && (
                      <ConfirmButton
                        action={deleteAdminAccount.bind(null, a.id)}
                        confirm={`確定要刪除後台帳號 ${a.email} 嗎？`}
                        className="btn btn-sm text-ash hover:text-error"
                      >
                        刪除
                      </ConfirmButton>
                    )}
                  </div>
                </Td>
              </tr>
            );
          })}
        </tbody>
      </Table>
      <CreateAdminForm />
    </div>
  );
}
