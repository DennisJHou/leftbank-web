"use client";

import Link from "next/link";
import { useActionState } from "react";
import { confirmEmail } from "@/app/actions/auth";
import { FormMessage, SubmitButton } from "@/components/forms";

export function TokenForm({ token }: { token: string }) {
  const [state, action] = useActionState(confirmEmail, undefined);
  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="token" value={token} />
      <FormMessage state={state} />
      <SubmitButton className="btn btn-stone w-full" pending="驗證中…">完成驗證並登入</SubmitButton>
      {state?.error && (
        <p className="text-center text-[14px]">
          <Link href="/signup/check-email" className="link">重新寄送驗證信</Link>
        </p>
      )}
    </form>
  );
}
