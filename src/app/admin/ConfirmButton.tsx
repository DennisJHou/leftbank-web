"use client";

import { useTransition } from "react";

/** 送出前先確認的按鈕（停用帳號、下架故事、刪除後台帳號等） */
export function ConfirmButton({
  action,
  confirm: message,
  children,
  className = "btn btn-outline btn-sm",
}: {
  action: () => Promise<unknown>;
  confirm?: string;
  children: React.ReactNode;
  className?: string;
}) {
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      className={className}
      onClick={() => {
        if (message && !window.confirm(message)) return;
        start(async () => {
          await action();
        });
      }}
    >
      {pending ? "處理中…" : children}
    </button>
  );
}
