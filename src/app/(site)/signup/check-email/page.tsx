import { AuthShell } from "@/components/AuthShell";
import { smtpConfigured } from "@/lib/mail";
import { ResendForm } from "./ResendForm";

export const metadata = { title: "請收信" };

export default async function CheckEmailPage({ searchParams }: PageProps<"/signup/check-email">) {
  const { email, unverified } = await searchParams;
  const addr = typeof email === "string" ? email : "";
  return (
    <AuthShell
      title="請到信箱收信"
      lead={
        unverified
          ? "你的 email 還沒有完成驗證。完成驗證後，帳號才算正式成立。"
          : `我們寄了一封驗證信${addr ? `到 ${addr}` : ""}，點信裡的按鈕就能完成註冊。`
      }
    >
      <div className="space-y-6">
        <p className="text-meta leading-relaxed text-stone">
          沒收到嗎？請看一下垃圾郵件匣，或重新寄送一次。
        </p>
        <ResendForm email={addr} />
        {!smtpConfigured() && process.env.NODE_ENV !== "production" && (
          <p className="notice">
            開發模式：尚未設定 Gmail SMTP，信件不會真的寄出。請到 <a href="/dev/mailbox" className="link">/dev/mailbox</a> 查看。
          </p>
        )}
      </div>
    </AuthShell>
  );
}
