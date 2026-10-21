import { redirect } from "next/navigation";
import { getAdmin } from "@/lib/admin-auth";
import { LogoMark } from "@/components/Logo";
import { AdminLoginForm } from "./LoginForm";

export const metadata = { title: "後台登入" };

export default async function AdminLoginPage() {
  if (await getAdmin()) redirect("/admin");
  return (
    <div className="flex min-h-dvh items-center justify-center px-4">
      <div className="w-full max-w-[400px]">
        <div className="flex items-center gap-2.5 text-stone">
          <LogoMark />
          <span className="font-serif text-item tracking-[0.12em]">左岸計畫 · 後台</span>
        </div>
        <div className="card mt-8 p-7">
          <AdminLoginForm />
        </div>
      </div>
    </div>
  );
}
