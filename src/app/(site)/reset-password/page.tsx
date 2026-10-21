import { AuthShell } from "@/components/AuthShell";
import { ResetForm } from "./ResetForm";

export const metadata = { title: "設定新密碼" };

export default async function ResetPasswordPage({ searchParams }: PageProps<"/reset-password">) {
  const { token } = await searchParams;
  return (
    <AuthShell title="設定新密碼">
      {typeof token === "string" && token ? (
        <ResetForm token={token} />
      ) : (
        <p className="notice notice-error">連結不完整，請回到信件重新點擊按鈕。</p>
      )}
    </AuthShell>
  );
}
