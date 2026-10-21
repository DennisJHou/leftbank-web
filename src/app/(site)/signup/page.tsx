import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { AuthShell } from "@/components/AuthShell";
import { SignupForm } from "./SignupForm";

export const metadata = { title: "註冊" };

export default async function SignupPage() {
  if (await getCurrentUser()) redirect("/me");
  return (
    <AuthShell
      title="加入左岸"
      lead={
        <>
          已經有帳號了？ <Link href="/login" className="link">登入</Link>
        </>
      }
    >
      <SignupForm />
    </AuthShell>
  );
}
