import { AuthShell } from "@/components/AuthShell";
import { TokenForm } from "./TokenForm";

export const metadata = { title: "驗證 email" };

export default async function VerifyPage({ searchParams }: PageProps<"/verify">) {
  const { token } = await searchParams;
  return (
    <AuthShell title="完成 email 驗證" lead="按下按鈕，你的帳號就正式成立了。">
      {typeof token === "string" && token ? (
        <TokenForm token={token} />
      ) : (
        <p className="notice notice-error">驗證連結不完整，請回到信件重新點擊按鈕。</p>
      )}
    </AuthShell>
  );
}
