import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { AuthShell } from "@/components/AuthShell";
import { SignupForm } from "./SignupForm";

export const metadata = { title: "註冊" };

export default async function SignupPage({ searchParams }: PageProps<"/signup">) {
  const sp = await searchParams;
  if (await getCurrentUser()) redirect("/me");
  return (
    <AuthShell
      title="註冊"
      lead={
        <>
          已經有帳號了？ <Link href="/login" className="link">登入</Link>
        </>
      }
    >
      <SignupForm asAlumni={sp.as === "alumni"} />
    </AuthShell>
  );
}
