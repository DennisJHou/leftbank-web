"use client";

import { useActionState } from "react";
import { runSweepNow } from "../../actions";
import { FormMessage, SubmitButton } from "@/components/forms";

export function SweepButton() {
  const [state, action] = useActionState(runSweepNow, undefined);
  return (
    <form action={action} className="flex flex-col items-end gap-2">
      <SubmitButton className="btn btn-sm" pending="檢查中…">立即檢查逾期與完成確認</SubmitButton>
      <FormMessage state={state} />
    </form>
  );
}
