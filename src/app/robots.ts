import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  // 封測期（有設整站密碼）：完全不讓搜尋引擎收錄
  if (process.env.SITE_GATE_PASSWORD) return { rules: { userAgent: "*", disallow: "/" } };
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/admin", "/me", "/r/", "/compass/result", "/compass/try", "/dev", "/verify", "/reset-password"] },
  };
}
