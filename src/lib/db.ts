/**
 * 資料庫連線
 *
 * - 有 DATABASE_URL：連到 Postgres（正式環境是 Supabase）
 * - 沒有 DATABASE_URL：使用內嵌的 PGlite，資料存在 .data/pglite，第一次啟動會自動建表並放入示範資料
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
    // Vercel 實例閒置時會被凍結，連線在背後被 pooler 關掉卻沒人知道；縮短壽命並限制連線等待時間
    idle_timeout: 5,
    max_lifetime: 120,
    connect_timeout: 10,
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

  /**
   * 連線若在背後已死，查詢會一直等下去。超過時限就丟掉整個連線池；單純的 select 自動換新連線重試一次，
   * 寫入不重試（不確定有沒有成功），直接回報錯誤讓使用者再按一次。交易裡的查詢不處理，由外層交易統一失敗。
   */
  const QUERY_TIMEOUT_MS = 8000;
  const TIMEOUT = "資料庫查詢逾時";
  const guarded = async <T,>(text: string, params: unknown[], run: () => Promise<T[]>): Promise<T[]> => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      return await Promise.race([
        run(),
        new Promise<never>((_, reject) => {
          timer = setTimeout(() => reject(new Error(TIMEOUT)), QUERY_TIMEOUT_MS);
        }),
      ]);
    } catch (err) {
      if (!(err instanceof Error) || err.message !== TIMEOUT) throw err;
      console.error(`[db] 查詢逾時，重建連線池：${text.slice(0, 80)}`);
      g.__leftbankDb = undefined;
      void sql.end({ timeout: 0 }).catch(() => {});
      if (!/^\s*select\b/i.test(text)) throw err;
      return (await db()).query<T>(text, params);
    } finally {
      clearTimeout(timer);
    }
  };

  const wrap = (s: Sql | TransactionSql, inTx = false): Db => ({
    kind: "postgres",
    async query<T>(text: string, params: unknown[] = []) {
      const run = async () => (await s.unsafe(text, params as never[])) as unknown as T[];
      return inTx ? run() : guarded(text, params, run);
    },
    async one<T>(text: string, params: unknown[] = []) {
      const rows = await this.query<T>(text, params);
      return (rows[0] as T | undefined) ?? null;
    },
    async exec(text: string) {
      await s.unsafe(text);
    },
    async tx<T>(fn: (db: Db) => Promise<T>) {
      if ("begin" in s) {
        return (await s.begin((t) => fn(wrap(t, true)))) as T;
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
  const { seedIfEmpty } = await import("./seed");
  await seedIfEmpty(conn);
  return conn;
}
