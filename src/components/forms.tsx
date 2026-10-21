"use client";

import { useFormStatus } from "react-dom";

export function SubmitButton({
  children,
  pending: pendingLabel,
  className = "btn btn-stone",
  disabled,
  name,
  value,
}: {
  children: React.ReactNode;
  pending?: string;
  className?: string;
  disabled?: boolean;
  name?: string;
  value?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className={className} disabled={pending || disabled} name={name} value={value}>
      {pending ? (pendingLabel ?? "處理中…") : children}
    </button>
  );
}

export function FormMessage({ state }: { state: { error?: string; ok?: string } | undefined }) {
  if (!state?.error && !state?.ok) return null;
  return (
    <p role={state.error ? "alert" : "status"} className={`notice ${state.error ? "notice-error" : "notice-ok"}`}>
      {state.error ?? state.ok}
    </p>
  );
}
