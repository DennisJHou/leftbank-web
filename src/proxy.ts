import { NextResponse, type NextRequest } from "next/server";

/** 封測期的整站密碼：設了 SITE_GATE_PASSWORD 就要先通過瀏覽器的帳號密碼視窗（帳號隨意）。排程路由自己用 CRON_SECRET 驗證，不受影響 */
function gateOk(req: NextRequest, password: string): boolean {
  const header = req.headers.get("authorization");
  if (!header?.startsWith("Basic ")) return false;
  try {
    const decoded = atob(header.slice(6));
    const given = decoded.slice(decoded.indexOf(":") + 1);
    if (given.length !== password.length) return false;
    let diff = 0;
    for (let i = 0; i < given.length; i++) diff |= given.charCodeAt(i) ^ password.charCodeAt(i);
    return diff === 0;
  } catch {
    return false;
  }
}

/** 後台的第一道關卡：沒有後台 cookie 就導向後台登入頁（真正的權限檢查在每個頁面與動作裡） */
export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const gate = process.env.SITE_GATE_PASSWORD;
  if (gate && !pathname.startsWith("/api/cron") && !gateOk(req, gate)) {
    return new NextResponse("需要密碼才能瀏覽", {
      status: 401,
      headers: {
        "WWW-Authenticate": 'Basic realm="Left Bank", charset="UTF-8"',
        "X-Robots-Tag": "noindex, nofollow",
      },
    });
  }

  if (pathname.startsWith("/admin") && pathname !== "/admin/login" && !req.cookies.has("lb_admin")) {
    return NextResponse.redirect(new URL("/admin/login", req.url));
  }
  const res = NextResponse.next();
  if (pathname.startsWith("/admin") || gate) res.headers.set("X-Robots-Tag", "noindex, nofollow");
  return res;
}

export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"] };
