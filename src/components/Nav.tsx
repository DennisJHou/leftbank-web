import { getCurrentUser } from "@/lib/auth";
import { Logo } from "./Logo";
import { NavLinks, UserMenu, MobileMenu } from "./NavClient";

export async function Nav() {
  const user = await getCurrentUser();
  const u = user ? { name: user.name, photo: user.photo_url } : null;
  return (
    <header className="sticky top-0 z-40 bg-canvas/90 backdrop-blur supports-[backdrop-filter]:bg-canvas/80">
      <div className="container-page flex h-16 items-center gap-4 md:h-20">
        <Logo />
        <div className="ml-auto flex items-center gap-2 md:gap-8">
          <nav className="hidden md:block" aria-label="主要導覽">
            <NavLinks />
          </nav>
          {u ? (
            <UserMenu user={u} />
          ) : (
            <a href="/login" className="btn btn-primary btn-sm md:min-h-[40px] md:px-5">
              註冊／登入
            </a>
          )}
          <MobileMenu />
        </div>
      </div>
    </header>
  );
}
