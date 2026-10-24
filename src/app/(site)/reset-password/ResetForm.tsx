"use client";

import { useActionState } from "react";
import { resetPassword } from "@/app/actions/auth";
import { FormMessage, SubmitButton } from "@/components/forms";
import { PASSWORD_MIN } from "@/lib/constants";

export function ResetForm({ token }: { token: string }) {
  const [state, action] = useActionState(resetPassword, undefined);
  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="token" value={token} />
      <div>
        <label className="field-label" htmlFor="password">新密碼</label>
        <input
          id="password"
          name="password"
          type="password"
          required
          minLength={PASSWORD_MIN}
          autoComplete="new-password"
          className="input"
        />
        <p className="field-hint">至少 {PASSWORD_MIN} 個字元。設定後，其他裝置上的登入會被登出。</p>
      </div>
      <FormMessage state={state} />
      <SubmitButton className="btn btn-primary w-full" pending="更新中…">更新密碼</SubmitButton>
    </form>
  );
}
