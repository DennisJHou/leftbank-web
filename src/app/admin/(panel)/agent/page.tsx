import Link from "next/link";
import { requireAdmin } from "@/lib/admin-auth";
import { query } from "@/lib/db";
import { semesterOf } from "@/lib/semester";
import { SUBSCALE_ORDER, SUBSCALES, type SubscaleKey } from "@/lib/cddq";
import { DIAGNOSIS_VERSION, THRESHOLD_NOTES, THRESHOLDS } from "@/lib/diagnosis-config";
import { ROUTE_LABEL } from "@/lib/agent/copy";
import { ROUTES, type Route } from "@/lib/agent/types";
import { BarRow, fmtDateTime, PageTitle, Stat, Table, Td, Th } from "../../ui";

export const dynamic = "force-dynamic";
export const metadata = { title: "分流 Agent" };

const MIN_CELL = 5;
const STATUS_TEXT: Record<string, string> = {
  queued: "排隊中",
  running: "執行中",
  succeeded: "成功",
  failed: "失敗",
  fallback: "未通過驗證",
  skipped: "略過",
};

export default async function AgentPage() {
  const admin = await requireAdmin();
  const isSuper = admin.level === "super";

  const [agg, sessions] = await Promise.all([
    query<{ status: string; n: number; cost: number; secs: number | null }>(
      `select status, count(*)::int as n, coalesce(avg(cost_usd), 0)::float8 as cost,
              avg(extract(epoch from (finished_at - started_at)))::float8 as secs
         from agent_runs group by status`,
    ),
    query<{ created_at: Date; route: Route | null; salient: SubscaleKey[] | null }>(
      `select created_at, diagnosis->>'route' as route, array(select jsonb_array_elements_text(diagnosis->'salient')) as salient
         from compass_sessions where kind = 'cddq' and status = 'completed' and diagnosis is not null`,
    ),
  ]);
  const ran = agg.filter((a) => a.status !== "skipped");
  const total = ran.reduce((s, a) => s + a.n, 0);
  const ok = agg.find((a) => a.status === "succeeded");
  const avgCost = total ? ran.reduce((s, a) => s + a.cost * a.n, 0) / total : 0;
  const skipped = agg.find((a) => a.status === "skipped")?.n ?? 0;

  // 分流統計（依學期）
  const bySem = new Map<string, { label: string; counts: Record<string, number>; n: number }>();
  for (const s of sessions) {
    const sem = semesterOf(s.created_at);
    const row = bySem.get(sem.key) ?? { label: sem.label, counts: {}, n: 0 };
    row.n++;
    if (s.route) row.counts[s.route] = (row.counts[s.route] ?? 0) + 1;
    bySem.set(sem.key, row);
  }
  const sems = [...bySem.entries()].sort((a, b) => b[0].localeCompare(a[0], "en", { numeric: true }));
  const cell = (n: number) => (!isSuper && n > 0 && n < MIN_CELL ? "<5" : String(n));

  const salientCount = Object.fromEntries(SUBSCALE_ORDER.map((k) => [k, 0])) as Record<SubscaleKey, number>;
  for (const s of sessions) for (const k of s.salient ?? []) if (k in salientCount) salientCount[k]++;
  const maxSalient = Math.max(1, ...Object.values(salientCount));

  const runs = isSuper
    ? await query<{
        id: string;
        session_id: string;
        status: string;
        attempt: number;
        model: string | null;
        cost_usd: number;
        error: string | null;
        created_at: Date;
        secs: number | null;
        name: string;
        route: string | null;
      }>(
        `select r.id, r.session_id, r.status, r.attempt, r.model, r.cost_usd::float8 as cost_usd, r.error, r.created_at,
                extract(epoch from (r.finished_at - r.started_at))::float8 as secs, u.name, c.diagnosis->>'route' as route
           from agent_runs r join users u on u.id = r.user_id join compass_sessions c on c.id = r.session_id
          order by r.created_at desc limit 50`,
      )
    : [];

  return (
    <>
      <PageTitle
        title="分流 Agent"
        lead="CDDQ 做完後，網站用固定規則判讀並分流，再由 Agent 整理生涯報告。一般管理員只看彙總；個人生涯報告與工具紀錄只有超級管理員看得到。"
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="執行次數（不含略過）" value={total} sub={`略過 ${skipped}`} />
        <Stat label="成功率" value={total ? `${Math.round(((ok?.n ?? 0) / total) * 100)}%` : "—"} sub={`成功 ${ok?.n ?? 0}`} />
        <Stat label="平均花費" value={`$${avgCost.toFixed(3)}`} sub="每次（美元）" />
        <Stat label="平均耗時" value={ok?.secs ? `${Math.round(ok.secs)} 秒` : "—"} sub="成功的 run" />
      </div>

      <h2 className="mb-4 mt-12 h-section">分流統計</h2>
      {sems.length ? (
        <Table>
          <thead>
            <tr>
              <Th>學期</Th>
              {ROUTES.map((r) => (
                <Th key={r} className="text-right">{ROUTE_LABEL[r].title}</Th>
              ))}
              <Th className="text-right">合計</Th>
            </tr>
          </thead>
          <tbody>
            {sems.map(([key, s]) => (
              <tr key={key}>
                <Td>{s.label}</Td>
                {ROUTES.map((r) => (
                  <Td key={r} className="text-right tabular-nums">{cell(s.counts[r] ?? 0)}</Td>
                ))}
                <Td className="text-right tabular-nums">{s.n}</Td>
              </tr>
            ))}
          </tbody>
        </Table>
      ) : (
        <p className="text-meta text-ash">還沒有含診斷的作答紀錄。</p>
      )}
      {!isSuper && <p className="mt-2 text-note text-ash">為了避免辨識出個人，人數少於 5 的格子顯示為「&lt;5」。</p>}

      <h2 className="mb-4 mt-12 h-section">各面向被判為「突出」的次數</h2>
      <div className="card space-y-2.5 p-5">
        {SUBSCALE_ORDER.map((k) => (
          <BarRow key={k} label={SUBSCALES[k].label} value={!isSuper && salientCount[k] > 0 && salientCount[k] < MIN_CELL ? 0 : salientCount[k]} max={maxSalient} />
        ))}
      </div>

      <h2 className="mb-4 mt-12 h-section">診斷門檻（{DIAGNOSIS_VERSION}）</h2>
      <Table>
        <thead>
          <tr>
            <Th>項目</Th>
            <Th className="text-right">目前的值</Th>
            <Th>出處</Th>
            <Th>狀態</Th>
          </tr>
        </thead>
        <tbody>
          {(Object.keys(THRESHOLDS) as (keyof typeof THRESHOLDS)[]).map((k) => (
            <tr key={k}>
              <Td>{THRESHOLD_NOTES[k].label}</Td>
              <Td className="text-right tabular-nums">{THRESHOLDS[k]}</Td>
              <Td className="text-note">{THRESHOLD_NOTES[k].source}</Td>
              <Td className={THRESHOLD_NOTES[k].verified ? "text-ok" : "text-accent"}>{THRESHOLD_NOTES[k].verified ? "已查證" : "待查證"}</Td>
            </tr>
          ))}
        </tbody>
      </Table>
      <p className="mt-2 text-note text-ash">門檻寫在 src/lib/diagnosis-config.ts；每筆診斷都會記下當時用的值，改了之後舊紀錄仍可回溯。</p>

      {isSuper && (
        <>
          <h2 className="mb-4 mt-12 h-section">最近 50 次執行</h2>
          <Table>
            <thead>
              <tr>
                <Th>時間</Th>
                <Th>學生</Th>
                <Th>路徑</Th>
                <Th>狀態</Th>
                <Th className="text-right">花費</Th>
                <Th className="text-right">耗時</Th>
                <Th>備註</Th>
              </tr>
            </thead>
            <tbody>
              {runs.map((r) => (
                <tr key={r.id}>
                  <Td>{fmtDateTime(r.created_at)}</Td>
                  <Td>
                    <Link href={`/admin/compass/${r.session_id}`} className="underline-offset-4 hover:underline">{r.name}</Link>
                  </Td>
                  <Td className="text-note">{r.route ? ROUTE_LABEL[r.route as Route]?.title : "—"}</Td>
                  <Td>
                    {STATUS_TEXT[r.status] ?? r.status}
                    {r.attempt > 1 && <span className="text-note text-ash">（第 {r.attempt} 次）</span>}
                  </Td>
                  <Td className="text-right tabular-nums">${Number(r.cost_usd).toFixed(3)}</Td>
                  <Td className="text-right tabular-nums">{r.secs != null ? `${Math.round(r.secs)}s` : "—"}</Td>
                  <Td className="max-w-[18rem] truncate text-note text-ash" >{r.error ?? r.model ?? ""}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        </>
      )}
    </>
  );
}
