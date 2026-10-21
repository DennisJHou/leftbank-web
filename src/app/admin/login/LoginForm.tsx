"use client";

import { useActionState } from "react";
import { adminLoginAction } from "../actions";
import { FormMessage, SubmitButton } from "@/components/forms";

export function AdminLoginForm() {
  const [state, action] = useActionState(adminLoginAction, undefined);
  return (
    <form action={action} className="space-y-5">
      <div>
        <label className="field-label" htmlFor="email">後台帳號（email）</label>
        <input id="email" name="email" type="email" required autoComplete="username" className="input" />
      </div>
      <div>
        <label className="field-label" htmlFor="password">密碼</label>
        <input id="password" name="password" type="password" required autoComplete="current-password" className="input" />
      </div>
      <FormMessage state={state} />
      <SubmitButton className="btn btn-dark w-full" pending="登入中…">登入後台</SubmitButton>
      <p className="text-center text-note text-ash">連續失敗 5 次會鎖定 15 分鐘。</p>
    </form>
  );
}
