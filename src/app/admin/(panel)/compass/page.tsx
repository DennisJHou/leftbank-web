import Link from "next/link";
import { requireAdmin } from "@/lib/admin-auth";
import { query } from "@/lib/db";
import { monthKey, semesterOf } from "@/lib/semester";
import {
  CATEGORIES,
  GOAL_OPTIONS,
  levelOf,
  LEVEL_LABEL,
  STAGE_OPTIONS,
  SUBSCALE_ORDER,
  SUBSCALES,
  type CategoryKey,
  type CddqAnswers,
  type CddqScores,
} from "@/lib/cddq";
import type { AiReport } from "@/lib/ai";
import { BarRow, fmtDate, PageTitle, Table, Td, Th } from "../../ui";

export const metadata = { title: "職涯羅盤" };

/** 去識別化：人數少於這個數字的分組不顯示 */
const MIN_CELL = 3;
const CAT_KEYS = Object.keys(CATEGORIES) as CategoryKey[];

type Row = {
  id: string;
  user_id: string;
  kind: "cddq" | "ai";
  created_at: Date;
  answers: CddqAnswers;
  scores: CddqScores | null;
  report: AiReport | null;
};

export default async function CompassAdmin({ searchParams }: PageProps<"/admin/compass">) {
  const admin = await requireAdmin();
  const sp = await searchParams;
  const view = admin.level === "super" && sp.view === "people" ? "people" : "stats";

  return (
    <>
      <PageTitle
        title="職涯羅盤"
        lead={
          admin.level === "super"
            ? "超級管理員可以看個人結果；一般管理員只看得到去識別化的統計。"
            : `這裡只顯示去識別化的統計與趨勢；人數少於 ${MIN_CELL} 的分組不顯示。`
        }
      />
      {admin.level === "super" && (
        <div className="mb-8 flex gap-2">
          <Link href="/admin/compass" aria-current={view === "stats"} className="pill">統計與趨勢</Link>
          <Link href="/admin/compass?view=people" aria-current={view === "people"} className="pill">個人結果</Link>
        </div>
      )}
      {view === "stats" ? <Stats /> : <People />}
    </>
  );
}

async function Stats() {
  const rows = await query<Row>(
    "select id, user_id, kind, created_at, answers, scores, report from compass_sessions where status = 'completed' order by created_at",
  );
  if (!rows.length) return <p className="card p-8 text-center text-[14px] text-ash">還沒有任何羅盤紀錄。</p>;

  // 月趨勢（近 12 個月）
  const months = new Map<string, { cddq: number; ai: number }>();
  for (const r of rows) {
    const m = monthKey(r.created_at);
    const v = months.get(m) ?? { cddq: 0, ai: 0 };
    v[r.kind]++;
    months.set(m, v);
  }
  const monthList = [...months.entries()].sort().slice(-12);
  const maxMonth = Math.max(...monthList.map(([, v]) => v.cddq + v.ai));

  // 每學期三大類平均（每人每學期取最後一次，避免重測重複計算）
  const cddq = rows.filter((r) => r.kind === "cddq" && r.scores);
  const latestPerSem = new Map<string, Row>();
  for (const r of cddq) latestPerSem.set(`${semesterOf(r.created_at).key}|${r.user_id}`, r);
  const sems = new Map<string, { label: string; rows: Row[] }>();
  for (const [k, r] of latestPerSem) {
    const key = k.split("|")[0];
    const s = sems.get(key) ?? { label: semesterOf(r.created_at).label, rows: [] };
    s.rows.push(r);
    sems.set(key, s);
  }
  const semList = [...sems.entries()].sort((a, b) => b[0].localeCompare(a[0], "en", { numeric: true }));
  const avg = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;

  // 程度分布、最常見的主要困難、階段與目標（每人取最後一次）
  const latestPerUser = new Map<string, Row>();
  for (const r of cddq) latestPerUser.set(r.user_id, r);
  const people = [...latestPerUser.values()];
  const topCount = new Map<string, number>();
  for (const r of people) for (const k of r.scores!.top) topCount.set(k, (topCount.get(k) ?? 0) + 1);
  const topList = SUBSCALE_ORDER.map((k) => [SUBSCALES[k].label, topCount.get(k) ?? 0] as const).sort((a, b) => b[1] - a[1]);
  const count = <T extends string>(vals: T[]) => {
    const m = new Map<T, number>();
    for (const v of vals) m.set(v, (m.get(v) ?? 0) + 1);
    return m;
  };
  const stages = count(people.map((r) => r.answers.stage));
  const goals = count(people.map((r) => r.answers.goal));

  const ai = rows.filter((r) => r.kind === "ai" && r.report);

  return (
    <div className="space-y-14">
      <section>
        <h2 className="mb-4 font-serif text-[22px] font-light">每月使用次數</h2>
        <div className="card space-y-2.5 p-5">
          {monthList.map(([m, v]) => (
            <BarRow key={m} label={`${m}（AI ${v.ai}）`} value={v.cddq + v.ai} max={maxMonth} suffix=" 次" />
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-4 font-serif text-[22px] font-light">每學期三大類平均（1–9，越高越卡關）</h2>
        <Table>
          <thead>
            <tr>
              <Th>學期</Th>
              <Th className="text-right">人數</Th>
              {CAT_KEYS.map((c) => (
                <Th key={c} className="text-right">{CATEGORIES[c].label}</Th>
              ))}
            </tr>
          </thead>
          <tbody>
            {semList.map(([key, s]) => (
              <tr key={key}>
                <Td>{s.label}</Td>
                <Td className="text-right tabular-nums">{s.rows.length}</Td>
                {CAT_KEYS.map((c) => (
                  <Td key={c} className="text-right tabular-nums">
                    {s.rows.length >= MIN_CELL ? avg(s.rows.map((r) => r.scores!.categories[c])).toFixed(2) : <span className="text-mute">人數不足</span>}
                  </Td>
                ))}
              </tr>
            ))}
          </tbody>
        </Table>
      </section>

      {people.length >= MIN_CELL ? (
        <>
          <section className="grid gap-6 lg:grid-cols-2">
            <div>
              <h2 className="mb-4 font-serif text-[22px] font-light">三大類的程度分布</h2>
              <div className="card space-y-5 p-5">
                {CAT_KEYS.map((c) => {
                  const lv = count(people.map((r) => levelOf(r.scores!.categories[c])));
                  return (
                    <div key={c}>
                      <p className="mb-2 text-[14px] font-medium">{CATEGORIES[c].label}</p>
                      <div className="space-y-1.5">
                        {(["high", "moderate", "low"] as const).map((l) => (
                          <BarRow key={l} label={LEVEL_LABEL[l]} value={lv.get(l) ?? 0} max={people.length} suffix=" 人" />
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            <div>
              <h2 className="mb-4 font-serif text-[22px] font-light">最常見的主要困難</h2>
              <div className="card space-y-2 p-5">
                {topList.map(([label, n]) => (
                  <BarRow key={label} label={label} value={n} max={people.length} suffix=" 人" />
                ))}
              </div>
            </div>
          </section>
          <section className="grid gap-6 lg:grid-cols-2">
            <Distribution title="目前的階段" options={STAGE_OPTIONS} counts={stages} total={people.length} />
            <Distribution title="最想解決的事" options={GOAL_OPTIONS} counts={goals} total={people.length} />
          </section>
        </>
      ) : (
        <p className="text-[14px] text-ash">使用人數少於 {MIN_CELL} 人，暫不顯示分布。</p>
      )}

      <section>
        <h2 className="mb-4 font-serif text-[22px] font-light">AI 對談</h2>
        <p className="text-[14px] text-stone">完成報告 {ai.length} 份。</p>
        {ai.length >= MIN_CELL && (
          <div className="card mt-4 space-y-5 p-5">
            {CAT_KEYS.map((c) => {
              const lv = count(ai.map((r) => r.report!.categories[c]));
              return (
                <div key={c}>
                  <p className="mb-2 text-[14px] font-medium">{CATEGORIES[c].label}</p>
                  {(["high", "moderate", "low"] as const).map((l) => (
                    <BarRow key={l} label={LEVEL_LABEL[l]} value={lv.get(l) ?? 0} max={ai.length} suffix=" 人" />
                  ))}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

function Distribution({
  title,
  options,
  counts,
  total,
}: {
  title: string;
  options: readonly { value: string; label: string }[];
  counts: Map<string, number>;
  total: number;
}) {
  return (
    <div>
      <h2 className="mb-4 font-serif text-[22px] font-light">{title}</h2>
      <div className="card space-y-2 p-5">
        {options.map((o) => {
          const n = counts.get(o.value) ?? 0;
          return n > 0 && n < MIN_CELL ? (
            <div key={o.value} className="grid grid-cols-[7.5rem_1fr] gap-3 text-[14px]">
              <span className="truncate text-stone">{o.label}</span>
              <span className="text-mute">少於 {MIN_CELL} 人</span>
            </div>
          ) : (
            <BarRow key={o.value} label={o.label} value={n} max={total} suffix=" 人" />
          );
        })}
      </div>
    </div>
  );
}

async function People() {
  await requireAdmin("super");
  const rows = await query<{ id: string; kind: string; created_at: Date; scores: CddqScores | null; report: AiReport | null; name: string; email: string }>(
    `select c.id, c.kind, c.created_at, c.scores, c.report, u.name, u.email
       from compass_sessions c join users u on u.id = c.user_id
      where c.status = 'completed' order by c.created_at desc limit 500`,
  );
  return (
    <Table>
      <thead>
        <tr>
          <Th>日期</Th>
          <Th>使用者</Th>
          <Th>版本</Th>
          {CAT_KEYS.map((c) => (
            <Th key={c}>{CATEGORIES[c].label}</Th>
          ))}
          <Th />
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.id}>
            <Td className="whitespace-nowrap text-[13px]">{fmtDate(r.created_at)}</Td>
            <Td>
              <p>{r.name}</p>
              <p className="text-[12px] text-ash">{r.email}</p>
            </Td>
            <Td className="whitespace-nowrap">{r.kind === "ai" ? "AI 對談" : "量表"}</Td>
            {CAT_KEYS.map((c) => (
              <Td key={c} className="whitespace-nowrap text-[13px]">
                {r.scores
                  ? `${LEVEL_LABEL[levelOf(r.scores.categories[c])]} ${r.scores.categories[c].toFixed(1)}`
                  : r.report
                    ? LEVEL_LABEL[r.report.categories[c]]
                    : "—"}
              </Td>
            ))}
            <Td>
              <Link href={`/admin/compass/${r.id}`} className="link text-[13px]">詳細</Link>
            </Td>
          </tr>
        ))}
      </tbody>
    </Table>
  );
}
