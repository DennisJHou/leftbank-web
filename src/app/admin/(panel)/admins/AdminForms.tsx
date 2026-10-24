"use client";

import { useActionState } from "react";
import { createAdminAccount, resetAdminPassword } from "../../actions";
import { FormMessage, SubmitButton } from "@/components/forms";

export function CreateAdminForm() {
  const [state, action] = useActionState(createAdminAccount, undefined);
  return (
    <form action={action} className="card space-y-4 p-6">
      <h2 className="h-section">新增後台帳號</h2>
      <div className="grid gap-4 md:grid-cols-2">
        <label>
          <span className="field-label">Email</span>
          <input name="email" type="email" required className="input" autoComplete="off" />
        </label>
        <label>
          <span className="field-label">名稱</span>
          <input name="name" placeholder="例如：系辦、系主任" className="input" />
        </label>
        <label>
          <span className="field-label">初始密碼（至少 12 字元）</span>
          <input name="password" type="password" required minLength={12} className="input" autoComplete="new-password" />
        </label>
        <label>
          <span className="field-label">權限</span>
          <select name="level" className="input" defaultValue="admin">
            <option value="admin">管理員（只看去識別化統計）</option>
            <option value="super">超級管理員</option>
          </select>
        </label>
      </div>
      <FormMessage state={state} />
      <SubmitButton className="btn btn-primary" pending="建立中…">建立帳號</SubmitButton>
    </form>
  );
}

export function ResetPasswordForm({ id }: { id: string }) {
  const [state, action] = useActionState(resetAdminPassword, undefined);
  return (
    <form action={action} className="mt-2 flex flex-wrap items-center gap-2">
      <input type="hidden" name="id" value={id} />
      <input name="password" type="password" required minLength={12} placeholder="新密碼" className="input !min-h-[36px] w-44 !py-1 text-note" autoComplete="new-password" />
      <SubmitButton className="btn btn-sm" pending="…">重設</SubmitButton>
      <FormMessage state={state} />
    </form>
  );
}
