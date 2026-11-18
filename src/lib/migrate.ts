import fs from "node:fs";
import path from "node:path";
import { pgArray, type Db } from "./db";
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

  // 資源目錄種子：只補上還沒有的項目，不覆蓋後台修改過的內容
  const seedFile = path.join(process.cwd(), "db", "seed", "resources.json");
  if (fs.existsSync(seedFile)) {
    const list = JSON.parse(fs.readFileSync(seedFile, "utf8")) as {
      id: string; title: string; provider: string; level: string; url: string; summary: string;
      subscales: string[]; components: string[]; evidence: string; needs_human: boolean;
    }[];
    for (const r of list) {
      await db.query(
        `insert into resources (id, title, provider, level, url, summary, subscales, components, evidence, needs_human, last_verified)
         values ($1, $2, $3, $4, $5, $6, $7::text[], $8::text[], $9, $10, $11) on conflict (id) do nothing`,
        [r.id, r.title, r.provider, r.level, r.url, r.summary, pgArray(r.subscales), pgArray(r.components), r.evidence, r.needs_human, "2026-11-18"],
      );
    }
  }

  for (const [key, value] of Object.entries(DEFAULT_SITE_CONTENT)) {
    await db.query("insert into site_content (key, value) values ($1, $2) on conflict (key) do nothing", [key, value]);
  }
}
