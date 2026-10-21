import fs from "node:fs";
import path from "node:path";
import type { Db } from "./db";
import { TAG_VOCAB } from "./tags";
import { DEFAULT_SITE_CONTENT } from "./site-content-defaults";

/** 依檔名順序執行 db/migrations 裡還沒跑過的 SQL，然後補齊標籤詞彙表與首頁預設文字 */
export async function migrate(db: Db, log: (msg: string) => void = () => {}) {
  await db.exec(`create table if not exists schema_migrations (
    name text primary key,
    applied_at timestamptz not null default now()
  );
  alter table schema_migrations enable row level security;`);

  const dir = path.join(process.cwd(), "db", "migrations");
  const files = fs.readdirSync(dir).filter((f) => f.endsWith(".sql")).sort();
  const done = new Set((await db.query<{ name: string }>("select name from schema_migrations")).map((r) => r.name));

  for (const file of files) {
    if (done.has(file)) continue;
    const sql = fs.readFileSync(path.join(dir, file), "utf8");
    await db.tx(async (t) => {
      await t.exec(sql);
      await t.query("insert into schema_migrations (name) values ($1)", [file]);
    });
    log(`applied ${file}`);
  }

  for (const [dimension, labels] of Object.entries(TAG_VOCAB)) {
    for (const label of labels) {
      await db.query(
        "insert into tag_vocab (dimension, label) values ($1, $2) on conflict (dimension, label) do nothing",
        [dimension, label],
      );
    }
  }

  for (const [key, value] of Object.entries(DEFAULT_SITE_CONTENT)) {
    await db.query("insert into site_content (key, value) values ($1, $2) on conflict (key) do nothing", [key, value]);
  }
}
