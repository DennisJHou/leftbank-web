"use client";

import { useActionState } from "react";
import { respondToRequest } from "@/app/actions/requests";
import { FormMessage, SubmitButton } from "@/components/forms";

const LABELS = { accept: "我會聯絡他", decline: "這次先婉拒", complete: "已經完成了" } as const;

export function RespondForm({ token, action }: { token: string; action: keyof typeof LABELS }) {
  const [state, formAction] = useActionState(respondToRequest, undefined);
  if (state?.ok) return <FormMessage state={state} />;
  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="token" value={token} />
      <input type="hidden" name="action" value={action} />
      <FormMessage state={state} />
      {!state?.error && (
        <SubmitButton className={`btn ${action === "decline" ? "btn-outline" : "btn-stone"}`} pending="處理中…">
          確認：{LABELS[action]}
        </SubmitButton>
      )}
    </form>
  );
}
