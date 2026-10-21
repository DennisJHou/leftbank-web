import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { AuthShell } from "@/components/AuthShell";
import { LoginForm } from "./LoginForm";

export const metadata = { title: "登入" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { next, reset } = await searchParams;
  const nextPath = typeof next === "string" ? next : undefined;
  if (await getCurrentUser()) redirect(nextPath ?? "/me");
  return (
    <AuthShell
      title="登入"
      lead={
        <>
          還沒有帳號？{" "}
          <Link href={`/signup${nextPath ? `?next=${encodeURIComponent(nextPath)}` : ""}`} className="link">
            註冊左岸計畫
          </Link>
        </>
      }
    >
      {reset && <p className="notice notice-ok mb-6">密碼已更新，請用新密碼登入。</p>}
      {nextPath && !reset && <p className="notice mb-6">登入之後，就可以聯絡系友、使用職涯羅盤。</p>}
      <LoginForm next={nextPath} />
    </AuthShell>
  );
}
