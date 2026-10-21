import { requireAdmin } from "@/lib/admin-auth";
import { LogoMark } from "@/components/Logo";
import { adminLogoutAction } from "../actions";
import { AdminNav } from "./AdminNav";

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdmin();
  const items = [
    { href: "/admin", label: "儀表板" },
    { href: "/admin/accounts", label: "帳號管理" },
    { href: "/admin/stories", label: "故事管理" },
    { href: "/admin/talks", label: "演講意願" },
    { href: "/admin/requests", label: "提問與咖啡" },
    { href: "/admin/compass", label: "職涯羅盤" },
    { href: "/admin/content", label: "首頁內容" },
    ...(admin.level === "super" ? [{ href: "/admin/admins", label: "後台帳號" }] : []),
  ];
  return (
    <div className="mx-auto max-w-[1360px] px-4 md:flex md:gap-10 md:px-8">
      <aside className="py-5 md:sticky md:top-0 md:h-dvh md:w-52 md:shrink-0 md:py-8">
        <div className="flex items-center justify-between md:block">
          <div className="flex items-center gap-2 text-stone">
            <LogoMark className="h-6 w-6" />
            <span className="font-serif text-[16px] tracking-[0.1em]">左岸 · 後台</span>
          </div>
          <form action={adminLogoutAction} className="md:hidden">
            <button className="text-[13px] text-ash">登出</button>
          </form>
        </div>
        <div className="mt-5 md:mt-8">
          <AdminNav items={items} />
        </div>
        <div className="mt-8 hidden border-t border-hairline pt-5 text-[13px] md:block">
          <p className="truncate text-stone">{admin.name || admin.email}</p>
          <p className="text-ash">{admin.level === "super" ? "超級管理員" : "管理員"}</p>
          <form action={adminLogoutAction}>
            <button className="mt-3 text-ash hover:text-stone">登出</button>
          </form>
        </div>
      </aside>
      <main className="min-w-0 flex-1 pb-20 md:py-8">{children}</main>
    </div>
  );
}
