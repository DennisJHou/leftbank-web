import "server-only";
import { query } from "./db";

export type Resource = {
  id: string;
  title: string;
  provider: string;
  level: "national" | "university" | "college" | "department" | "leftbank";
  url: string;
  summary: string;
  subscales: string[];
  components: string[];
  evidence: "direct" | "inferred" | "preliminary";
  needs_human: boolean;
  active: boolean;
  last_verified: string;
  updated_at: Date;
};

export const LEVEL_TEXT: Record<Resource["level"], string> = {
  national: "全國",
  university: "校級",
  college: "院級",
  department: "系級",
  leftbank: "左岸",
};

const COLS = "id, title, provider, level, url, summary, subscales, components, evidence, needs_human, active, to_char(last_verified, 'YYYY-MM-DD') as last_verified, updated_at";

export async function listResources(opts: { activeOnly?: boolean } = {}) {
  return query<Resource>(`select ${COLS} from resources ${opts.activeOnly ? "where active" : ""} order by level, id`);
}

export async function resourcesByIds(ids: string[]) {
  if (!ids.length) return [];
  return query<Resource>(`select ${COLS} from resources where id = any($1::text[])`, [`{${ids.map((i) => `"${i.replace(/"/g, "")}"`).join(",")}}`]);
}

/** 依小項找資源，只回啟用中的；與越多小項重疊的排越前面 */
export async function searchResources(subscales: string[], opts: { needsHuman?: boolean; level?: Resource["level"] } = {}) {
  const all = await listResources({ activeOnly: true });
  return all
    .filter((r) => (opts.needsHuman == null || r.needs_human === opts.needsHuman) && (!opts.level || r.level === opts.level))
    .map((r) => ({ r, hit: r.subscales.filter((s) => subscales.includes(s)).length }))
    .filter((x) => x.hit > 0)
    .sort((a, b) => b.hit - a.hit)
    .map((x) => x.r);
}

/** 超過 60 天沒有查證的資源數（儀表板用） */
export async function staleResourceCount() {
  const [row] = await query<{ n: number }>("select count(*)::int as n from resources where active and last_verified < current_date - 60");
  return row?.n ?? 0;
}
