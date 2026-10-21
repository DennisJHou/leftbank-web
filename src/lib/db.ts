/**
 * 資料庫連線
 *
 * - 有 DATABASE_URL：連到 Postgres（正式環境是 Supabase）
 * - 沒有 DATABASE_URL：使用內嵌的 PGlite，資料存在 .data/pglite，第一次啟動會自動建表
 *
 * 兩邊都用 $1、$2 參數。陣列請用 pgArray() 轉成文字再 ::text[]，物件請 JSON.stringify 後 ::jsonb。
 */
import path from "node:path";
import fs from "node:fs";
import type { Sql, TransactionSql } from "postgres";

export type Row = Record<string, unknown>;

export interface Db {
  query<T = Row>(text: string, params?: unknown[]): Promise<T[]>;
  one<T = Row>(text: string, params?: unknown[]): Promise<T | null>;
  exec(text: string): Promise<void>;
  tx<T>(fn: (db: Db) => Promise<T>): Promise<T>;
  readonly kind: "postgres" | "pglite";
}

type Global = typeof globalThis & { __leftbankDb?: Promise<Db> };
const g = globalThis as Global;

export function db(): Promise<Db> {
  if (!g.__leftbankDb) {
    g.__leftbankDb = (process.env.DATABASE_URL ? connectPostgres(process.env.DATABASE_URL) : connectPglite()).catch(
      (err) => {
        g.__leftbankDb = undefined;
        throw err;
      },
    );
  }
  return g.__leftbankDb;
}

export async function query<T = Row>(text: string, params?: unknown[]) {
  return (await db()).query<T>(text, params);
}

export async function one<T = Row>(text: string, params?: unknown[]) {
  return (await db()).one<T>(text, params);
}

export async function tx<T>(fn: (db: Db) => Promise<T>) {
  return (await db()).tx(fn);
}

/** 把字串陣列轉成 Postgres 陣列文字，例如 {"a","b"}，搭配 $1::text[] 使用 */
export function pgArray(values: readonly string[]): string {
  return "{" + values.map((v) => '"' + v.replace(/\\/g, "\\\\").replace(/"/g, '\\"') + '"').join(",") + "}";
}

// ─── Postgres（Supabase） ───────────────────────────────

async function connectPostgres(url: string): Promise<Db> {
  const { default: postgres } = await import("postgres");
  const local = /localhost|127\.0\.0\.1/.test(url);
  const sql = postgres(url, {
    // Supabase 的 transaction pooler 不支援 prepared statements
    prepare: false,
    max: 5,
    idle_timeout: 20,
    ssl: local ? false : "require",
    onnotice: () => {},
    types: {
      // 程式一律以 JSON.stringify(...) 傳入 jsonb 參數；已經是字串就原樣送出，避免被重複編碼成 JSON 字串
      json: {
        to: 114,
        from: [114, 3802],
        serialize: (x: unknown) => (typeof x === "string" ? x : JSON.stringify(x)),
        parse: (x: string) => JSON.parse(x),
      },
    },
  });

  const wrap = (s: Sql | TransactionSql): Db => ({
    kind: "postgres",
    async query<T>(text: string, params: unknown[] = []) {
      const rows = await s.unsafe(text, params as never[]);
      return rows as unknown as T[];
    },
    async one<T>(text: string, params: unknown[] = []) {
      const rows = await s.unsafe(text, params as never[]);
      return (rows[0] as T | undefined) ?? null;
    },
    async exec(text: string) {
      await s.unsafe(text);
    },
    async tx<T>(fn: (db: Db) => Promise<T>) {
      if ("begin" in s) {
        return (await s.begin((t) => fn(wrap(t)))) as T;
      }
      return fn(wrap(s)); // 已經在交易裡
    },
  });
  return wrap(sql);
}

// ─── PGlite（本機開發） ─────────────────────────────────

async function connectPglite(): Promise<Db> {
  if (process.env.NODE_ENV === "production" && process.env.VERCEL) {
    throw new Error("正式環境必須設定 DATABASE_URL");
  }
  const { PGlite } = await import("@electric-sql/pglite");
  const dir = path.join(process.cwd(), ".data", "pglite");
  fs.mkdirSync(dir, { recursive: true });
  const pg = await PGlite.create(dir);

  type Tx = Parameters<Parameters<typeof pg.transaction>[0]>[0];
  const wrap = (s: typeof pg | Tx, inTx: boolean): Db => ({
    kind: "pglite",
    async query<T>(text: string, params: unknown[] = []) {
      const res = await s.query(text, params);
      return res.rows as T[];
    },
    async one<T>(text: string, params: unknown[] = []) {
      const res = await s.query(text, params);
      return (res.rows[0] as T | undefined) ?? null;
    },
    async exec(text: string) {
      await s.exec(text);
    },
    async tx<T>(fn: (db: Db) => Promise<T>) {
      if (inTx) return fn(wrap(s, true));
      return (pg as typeof pg).transaction((t) => fn(wrap(t, true)));
    },
  });

  const conn = wrap(pg, false);
  const { migrate } = await import("./migrate");
  await migrate(conn);
  return conn;
}
