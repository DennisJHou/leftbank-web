"use client";

import { useActionState } from "react";
import { resendVerification } from "@/app/actions/auth";
import { FormMessage, SubmitButton } from "@/components/forms";

export function ResendForm({ email }: { email: string }) {
  const [state, action] = useActionState(resendVerification, undefined);
  return (
    <form action={action} className="space-y-4">
      <input type="email" name="email" defaultValue={email} required className="input" aria-label="Email" />
      <FormMessage state={state} />
      <SubmitButton className="btn" pending="寄送中…">重新寄送驗證信</SubmitButton>
    </form>
  );
}
