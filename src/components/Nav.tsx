import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { Logo } from "./Logo";
import { NavLinks, UserMenu, MobileMenu } from "./NavClient";

/** 導覽列：左 logo、中間主要連結、右側帳號（參考 Aesop） */
export async function Nav() {
  const user = await getCurrentUser();
  const u = user ? { name: user.name, photo: user.photo_url } : null;
  return (
    <header className="sticky top-0 z-40 border-b border-hairline bg-canvas">
      <div className="container-page grid h-[72px] grid-cols-[1fr_auto] items-center gap-4 md:grid-cols-[1fr_auto_1fr]">
        <Logo />
        <nav className="hidden md:block" aria-label="主要導覽">
          <NavLinks />
        </nav>
        <div className="flex items-center justify-end gap-3">
          {u ? (
            <UserMenu user={u} />
          ) : (
            <Link href="/login" className="btn btn-primary btn-sm">
              註冊／登入
            </Link>
          )}
          <MobileMenu />
        </div>
      </div>
    </header>
  );
}
