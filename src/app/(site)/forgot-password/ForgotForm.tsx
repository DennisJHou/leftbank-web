"use client";

import { useActionState } from "react";
import { requestPasswordReset } from "@/app/actions/auth";
import { FormMessage, SubmitButton } from "@/components/forms";

export function ForgotForm() {
  const [state, action] = useActionState(requestPasswordReset, undefined);
  return (
    <form action={action} className="space-y-5">
      <div>
        <label className="field-label" htmlFor="email">Email</label>
        <input id="email" name="email" type="email" required autoComplete="email" className="input" />
      </div>
      <FormMessage state={state} />
      <SubmitButton className="btn btn-primary w-full" pending="寄送中…">寄送重設密碼信</SubmitButton>
    </form>
  );
}
