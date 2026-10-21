/** 清空本機 PGlite 資料庫與上傳的照片，下次啟動時重新建立空的資料表 */
import fs from "node:fs";
import path from "node:path";

if (process.env.DATABASE_URL) {
  console.error("偵測到 DATABASE_URL，為了安全，這支程式只能清除本機的 PGlite 資料。");
  process.exit(1);
}
for (const dir of ["pglite", "uploads"]) {
  fs.rmSync(path.join(process.cwd(), ".data", dir), { recursive: true, force: true });
}
console.log("✔ 已清除 .data/pglite 與 .data/uploads，請重新執行 npm run dev（請先停止正在執行的開發伺服器）");
