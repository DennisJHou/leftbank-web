import { NextResponse, type NextRequest } from "next/server";

/** 後台的第一道關卡：沒有後台 cookie 就導向後台登入頁（真正的權限檢查在每個頁面與動作裡） */
export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (pathname.startsWith("/admin") && pathname !== "/admin/login" && !req.cookies.has("lb_admin")) {
    return NextResponse.redirect(new URL("/admin/login", req.url));
  }
  const res = NextResponse.next();
  if (pathname.startsWith("/admin")) res.headers.set("X-Robots-Tag", "noindex, nofollow");
  return res;
}

export const config = { matcher: ["/admin/:path*"] };
