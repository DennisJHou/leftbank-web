import "server-only";
import { one, query } from "../db";
import { aiAvailability } from "../ai";
import { agentMaxPer30d } from "../diagnosis-config";
import { resourcesByIds } from "../resources";
import { eligibleStories } from "./tools";
import { STEP_ORDER } from "./copy";
import type { AgentPlan, AgentStatusPayload, Diagnosis, ResolvedPlan, RunStatus, Step } from "./types";

export type AgentRun = {
  id: string;
  session_id: string;
  user_id: string;
  status: RunStatus;
  attempt: number;
  model: string | null;
  steps: Step[];
  trace: unknown;
  result: AgentPlan | null;
  error: string | null;
  cost_usd: number;
  created_at: Date;
  started_at: Date | null;
  finished_at: Date | null;
};

export const initialSteps = (): Step[] => STEP_ORDER.map((key) => ({ key, status: "pending" }));

/**
 * 為一次 CDDQ 作答建立 Agent 執行。以下情況直接標成 skipped（結果頁顯示固定推薦，不出現「名額已滿」之類的字）：
 * 宣傳期外或預算用完、30 天內次數用完、分流為「先釐清」。
 */
export async function createRun(sessionId: string, userId: string, diagnosis: Diagnosis, attempt = 1) {
  let skip: string | null = null;
  if (diagnosis.route === "clarify_first") skip = "clarify_first";
  else if ((await aiAvailability()) !== "open") skip = "unavailable";
  else if (attempt === 1) {
    const used = await one<{ n: number }>(
      "select count(*)::int as n from agent_runs where user_id = $1 and attempt = 1 and status <> 'skipped' and created_at > now() - interval '30 days'",
      [userId],
    );
    if ((used?.n ?? 0) >= agentMaxPer30d()) skip = "quota";
  }
  const row = await one<{ id: string; status: RunStatus }>(
    `insert into agent_runs (session_id, user_id, status, attempt, steps, error, finished_at)
     values ($1, $2, $3, $4, $5::jsonb, $6, case when $3 = 'skipped' then now() end) returning id, status`,
    [sessionId, userId, skip ? "skipped" : "queued", attempt, JSON.stringify(initialSteps()), skip],
  );
  return row!;
}

export async function latestRun(sessionId: string) {
  return one<AgentRun>("select * from agent_runs where session_id = $1 order by created_at desc limit 1", [sessionId]);
}

export async function runCount(sessionId: string) {
  const r = await one<{ n: number }>("select count(*)::int as n from agent_runs where session_id = $1 and status <> 'skipped'", [sessionId]);
  return r?.n ?? 0;
}

/** 把資源 id、系友 id 展開成畫面需要的資料；系友已不符合資格時，那段引言就不顯示 */
export async function resolvePlan(plan: AgentPlan, prevSalient?: string[] | null): Promise<ResolvedPlan> {
  const ids = [...new Set(plan.focuses.flatMap((f) => f.resource_ids))];
  const [resources, stories] = await Promise.all([resourcesByIds(ids), eligibleStories()]);
  return {
    overview: plan.overview,
    focuses: plan.focuses.map(({ alumni_quote, resource_ids, ...f }) => {
      const s = alumni_quote ? stories.find((x) => x.id === alumni_quote.alumni_id) : undefined;
      return {
        ...f,
        quote: s && alumni_quote ? { alumniId: s.id, name: s.name, title: s.title, text: alumni_quote.quote } : null,
        resources: resource_ids
          .map((id) => resources.find((r) => r.id === id))
          .filter((r) => r && r.active)
          .map((r) => ({ id: r!.id, title: r!.title, provider: r!.provider, url: r!.url, summary: r!.summary, evidence: r!.evidence })),
        changed: prevSalient ? !prevSalient.includes(f.subscale) : undefined,
      };
    }),
  };
}

/** 結果頁輪詢用：只回本人的狀態 */
export async function statusFor(sessionId: string, userId: string): Promise<AgentStatusPayload | null> {
  const s = await one<{ id: string; created_at: Date }>("select id, created_at from compass_sessions where id = $1 and user_id = $2", [sessionId, userId]);
  if (!s) return null;
  const run = await latestRun(sessionId);
  if (!run) return { status: "none", steps: [], plan: null, canRetry: false };
  let plan: ResolvedPlan | null = null;
  if (run.status === "succeeded" && run.result) {
    const prev = await one<{ diagnosis: Diagnosis | null }>(
      `select diagnosis from compass_sessions where user_id = $1 and kind = 'cddq' and status = 'completed' and created_at < $2
        order by created_at desc limit 1`,
      [userId, new Date(s.created_at).toISOString()],
    );
    plan = await resolvePlan(run.result, prev?.diagnosis?.salient ?? null);
  }
  const canRetry = (run.status === "failed" || run.status === "fallback") && (await runCount(sessionId)) < 2;
  return { status: run.status, steps: run.steps, plan, canRetry };
}

export async function setSteps(runId: string, steps: Step[]) {
  await query("update agent_runs set steps = $2::jsonb where id = $1", [runId, JSON.stringify(steps)]);
}
