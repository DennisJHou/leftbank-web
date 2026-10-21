/**
 * 正式環境建表：DATABASE_URL=... npm run db:migrate
 * （本機 PGlite 會在第一次啟動時自動執行，不需要跑這支）
 */
import { db } from "../src/lib/db";
import { migrate } from "../src/lib/migrate";

async function main() {
  if (!process.env.DATABASE_URL) {
    console.log("沒有設定 DATABASE_URL：本機的 PGlite 會在 npm run dev 時自動建表，不需要執行這支程式。");
    return;
  }
  const conn = await db();
  await migrate(conn, console.log);
  console.log("✔ 資料表已是最新版本");
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
