import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: { root: process.cwd() },
  // PGlite 內含 WASM 與資料檔，交給 Node 直接載入，不經過打包
  serverExternalPackages: ["@electric-sql/pglite"],
  experimental: {
    serverActions: {
      // 照片與主視覺在瀏覽器端先縮圖，這個上限只是保險
      bodySizeLimit: "6mb",
    },
  },
};

export default nextConfig;
