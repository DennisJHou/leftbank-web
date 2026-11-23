import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { one, query } from "../db";
import { aiConfig, costOf, getClient, parseTags, recordUsage } from "../ai";
import { listResources } from "../resources";
import { saveUserTags } from "../recommend";
import type { CddqAnswers, CddqScores } from "../cddq";
import { STEP_ORDER } from "./copy";
import { AGENT_SYSTEM, buildStudentMessage, SUBMIT_TOOL } from "./prompt";
import { eligibleStories, runTool, TOOL_DEFS } from "./tools";
import { validatePlan, type ValidateContext } from "./validate";
import { mockPlan } from "./mock";
import { setSteps } from "./store";
import type { AgentPlan, Diagnosis, Step, StepKey } from "./types";

/**
 * 分流 Agent：Messages API ＋自己寫的工具迴圈（工具都在我們的資料庫，不需要沙盒）。
 * 計畫書 §2.1、§2.5。流程：claim run → 逐步更新進度 → 工具迴圈 → submit_plan → 驗證（可修補一次）→ 寫入。
 */

export const AGENT_MODEL = process.env.AGENT_MODEL || "claude-haiku-5-5";
const MAX_TOOL_CALLS = 10;
const TIMEOUT_MS = 240_000;
/** 網路工具只能查這些網域（含子網域）：臺大各單位、教育部、勞動部、青年署、台灣就業通 */
const WEB_DOMAINS = ["ntu.edu.tw", "moe.edu.tw", "mol.gov.tw", "wda.gov.tw", "yda.gov.tw", "taiwanjobs.gov.tw"];
/** 預設開啟；AGENT_WEB=off 時關閉 */
export const agentWebEnabled = () => process.env.AGENT_WEB !== "off";

type TraceEntry = { tool: string; input: unknown; result: string; ok: boolean; ms: number };

class PlanRejected extends Error {
  constructor(public errors: string[]) {
    super("plan failed validation");
  }
}

/** 執行一個 run。同一個 run 被觸發兩次時，只有第一次會真的執行。 */
export async function runAgent(runId: string): Promise<void> {
  const run = await one<{ id: string; session_id: string; user_id: string }>(
    `update agent_runs set status = 'running', started_at = now(), model = $2
      where id = $1 and status = 'queued' returning id, session_id, user_id`,
    [runId, aiConfig().mock ? "mock" : AGENT_MODEL],
  );
  if (!run) return;

  const session = await one<{ scores: CddqScores; answers: CddqAnswers; diagnosis: Diagnosis; created_at: Date }>(
    "select scores, answers, diagnosis, created_at from compass_sessions where id = $1",
    [run.session_id],
  );
  if (!session?.diagnosis) {
    await finish(runId, "failed", { error: "session has no diagnosis" });
    return;
  }

  const steps: Step[] = STEP_ORDER.map((key) => ({ key, status: "pending" }));
  let reached = -1;
  const advance = async (key: StepKey) => {
    const idx = STEP_ORDER.indexOf(key);
    if (idx <= reached) return;
    reached = idx;
    const now = new Date().toISOString();
    steps.forEach((s, i) => {
      if (i < idx && s.status !== "done") Object.assign(s, { status: "done", at: s.at ?? now });
      if (i === idx) Object.assign(s, { status: "active", at: now });
    });
    await setSteps(runId, steps);
  };
  await advance("profile");

  const [resources, stories, people] = await Promise.all([
    listResources({ activeOnly: true }),
    eligibleStories(),
    query<{ name: string }>("select distinct name from users where length(name) >= 2"),
  ]);
  const ctx: ValidateContext = {
    diagnosis: session.diagnosis,
    activeResourceIds: new Set(resources.map((r) => r.id)),
    stories: new Map(stories.map((s) => [s.id, s.answers as Record<string, string | undefined>])),
    personNames: people.map((p) => p.name),
  };

  const prev = await one<{ diagnosis: Diagnosis | null }>(
    `select diagnosis from compass_sessions where user_id = $1 and kind = 'cddq' and status = 'completed' and created_at < $2
      order by created_at desc limit 1`,
    [run.user_id, new Date(session.created_at).toISOString()],
  );
  const changed = prev?.diagnosis ? session.diagnosis.salient.filter((k) => !prev.diagnosis!.salient.includes(k)) : undefined;

  const trace: TraceEntry[] = [];
  let cost = 0;
  try {
    let plan: AgentPlan;
    if (aiConfig().mock) {
      const pause = (ms: number) => new Promise((r) => setTimeout(r, ms));
      await pause(900);
      await advance("stories");
      await pause(1100);
      await advance("resources");
      await pause(900);
      await advance("plan");
      plan = await mockPlan(session.diagnosis, session.scores, session.answers, stories.filter((s) => s.id !== run.user_id));
      const v = validatePlan(plan, ctx);
      if (!v.ok) throw new PlanRejected(v.errors);
      await pause(600);
    } else {
      const res = await realLoop({
        runId,
        userId: run.user_id,
        message: buildStudentMessage(runId, session.diagnosis, session.scores, session.answers, changed),
        ctx,
        advance,
        trace,
        addCost: (c) => (cost += c),
      });
      plan = res;
    }

    steps.forEach((s) => Object.assign(s, { status: "done", at: s.at ?? new Date().toISOString() }));
    await setSteps(runId, steps);
    await finish(runId, "succeeded", { result: plan, trace, cost });
    const tags = parseTags(plan.tags);
    if (tags.length) await saveUserTags(run.user_id, "ai", tags);
  } catch (e) {
    const rejected = e instanceof PlanRejected;
    console.error("[agent] run failed", runId, rejected ? (e as PlanRejected).errors : e);
    await finish(runId, rejected ? "fallback" : "failed", {
      error: rejected ? (e as PlanRejected).errors.join("\n").slice(0, 2000) : e instanceof Error ? e.message.slice(0, 500) : String(e),
      trace,
      cost,
    });
  }
}

async function finish(runId: string, status: "succeeded" | "failed" | "fallback", o: { result?: AgentPlan; trace?: TraceEntry[]; cost?: number; error?: string }) {
  await query(
    `update agent_runs set status = $2, result = $3::jsonb, trace = $4::jsonb, cost_usd = $5, error = $6, finished_at = now() where id = $1`,
    [runId, status, o.result ? JSON.stringify(o.result) : null, JSON.stringify(o.trace ?? []), o.cost ?? 0, o.error ?? null],
  );
}

// ─── 真實的工具迴圈 ─────────────────────────────────────

/** 從伺服器端工具（web_search / web_fetch）的結果收集出現過的網址，給驗證用；也記進軌跡 */
function collectUrls(content: Anthropic.Beta.BetaContentBlock[], ctx: ValidateContext, trace: TraceEntry[]) {
  ctx.seenUrls ??= new Set();
  for (const b of content as unknown as { type: string; input?: unknown; content?: unknown }[]) {
    if (b.type === "server_tool_use") trace.push({ tool: "web", input: b.input, result: "", ok: true, ms: 0 });
    if (b.type === "web_search_tool_result" && Array.isArray(b.content)) {
      const urls = (b.content as { url?: string }[]).map((r) => r.url).filter((u): u is string => Boolean(u));
      urls.forEach((u) => ctx.seenUrls!.add(u));
      trace.push({ tool: "web_search", input: null, result: urls.join(" "), ok: true, ms: 0 });
    }
    if (b.type === "web_fetch_tool_result" && b.content && typeof b.content === "object") {
      const url = (b.content as { url?: string }).url;
      if (url) ctx.seenUrls!.add(url);
      trace.push({ tool: "web_fetch", input: null, result: url ?? "error", ok: Boolean(url), ms: 0 });
    }
  }
}

async function realLoop(a: {
  runId: string;
  userId: string;
  message: string;
  ctx: ValidateContext;
  advance: (k: StepKey) => Promise<void>;
  trace: TraceEntry[];
  addCost: (usd: number) => void;
}): Promise<AgentPlan> {
  const client = getClient();
  const web = agentWebEnabled();
  const tools = [
    ...TOOL_DEFS,
    ...(web
      ? ([
          { type: "web_search_20260209", name: "web_search", max_uses: 5, allowed_domains: WEB_DOMAINS },
          { type: "web_fetch_20260209", name: "web_fetch", max_uses: 4, allowed_domains: WEB_DOMAINS },
        ] as unknown as Anthropic.Beta.BetaToolUnion[])
      : []),
    SUBMIT_TOOL,
  ];
  const messages: Anthropic.Beta.BetaMessageParam[] = [{ role: "user", content: a.message }];
  const abort = new AbortController();
  const timer = setTimeout(() => abort.abort(), TIMEOUT_MS);

  let toolCalls = 0;
  let repairs = 0;
  let nudged = false;
  let transientRetries = 0;
  try {
    for (let turn = 0; turn < 20; turn++) {
      let msg: Anthropic.Beta.BetaMessage;
      try {
        const stream = client.beta.messages.stream(
          {
            model: AGENT_MODEL,
            betas: ["server-side-fallback-2026-07-01"],
            fallbacks: "default",
            max_tokens: 32000,
            system: [{ type: "text", text: AGENT_SYSTEM, cache_control: { type: "ephemeral" } }],
            tools,
            output_config: { effort: "medium" },
            messages,
          },
          { signal: abort.signal },
        );
        msg = await stream.finalMessage();
      } catch (e) {
        // 連線中斷、5xx、429：系統自動重試一次；請求本身有問題（4xx）就直接失敗
        const retryable = !(e instanceof Anthropic.APIError) || e instanceof Anthropic.RateLimitError || (e.status ?? 0) >= 500;
        if (retryable && !abort.signal.aborted && transientRetries++ < 1) continue;
        throw e;
      }

      const usd = costOf(msg.model, msg.usage);
      a.addCost(usd);
      await recordUsage(a.userId, "agent", msg.model, msg.usage);
      await query("update agent_runs set cost_usd = cost_usd + $2 where id = $1", [a.runId, usd]);

      collectUrls(msg.content, a.ctx, a.trace);
      if (msg.stop_reason === "refusal") throw new Error("model refused");
      if (msg.stop_reason === "max_tokens") throw new Error("max_tokens reached");
      messages.push({ role: "assistant", content: msg.content });
      if (msg.stop_reason === "pause_turn") continue;

      if (msg.content.some((b) => (b as { type: string }).type === "server_tool_use")) await a.advance("resources");
      const uses = msg.content.filter((b): b is Anthropic.Beta.BetaToolUseBlock => b.type === "tool_use");
      if (!uses.length) {
        if (nudged) throw new Error("ended without submit_plan");
        nudged = true;
        messages.push({ role: "user", content: "請呼叫 submit_plan 交出生涯報告。" });
        continue;
      }

      const results: Anthropic.Beta.BetaToolResultBlockParam[] = [];
      let accepted: AgentPlan | null = null;
      await Promise.all(
        uses.map(async (u) => {
          if (u.name === "submit_plan") {
            await a.advance("plan");
            const v = validatePlan(u.input, a.ctx);
            a.trace.push({ tool: "submit_plan", input: null, result: v.ok ? "accepted" : v.errors.join("；"), ok: v.ok, ms: 0 });
            if (v.ok) {
              accepted = v.plan;
              results.push({ type: "tool_result", tool_use_id: u.id, content: "已收到。" });
            } else {
              if (repairs >= 1) throw new PlanRejected(v.errors);
              results.push({
                type: "tool_result",
                tool_use_id: u.id,
                is_error: true,
                content: `生涯報告沒有通過檢查，請修正後再呼叫一次 submit_plan：\n- ${v.errors.join("\n- ")}`,
              });
            }
            return;
          }
          if (u.name === "search_stories" || u.name === "get_story_excerpt" || u.name === "recommend_alumni") await a.advance("stories");
          if (u.name === "search_resources") await a.advance("resources");
          if (++toolCalls > MAX_TOOL_CALLS) {
            results.push({ type: "tool_result", tool_use_id: u.id, is_error: true, content: "工具次數已用完，請直接呼叫 submit_plan。" });
            return;
          }
          const t0 = Date.now();
          const r = await runTool(u.name, u.input, a.userId);
          a.trace.push({ tool: u.name, input: u.input, result: r.summary, ok: r.ok, ms: Date.now() - t0 });
          results.push({ type: "tool_result", tool_use_id: u.id, content: r.text, ...(r.ok ? {} : { is_error: true }) });
        }),
      );
      if (accepted) return accepted;
      if (uses.some((u) => u.name === "submit_plan")) repairs++;
      // 結果依 tool_use 的順序放回
      results.sort((x, y) => uses.findIndex((u) => u.id === x.tool_use_id) - uses.findIndex((u) => u.id === y.tool_use_id));
      messages.push({ role: "user", content: results });
    }
    throw new Error("too many turns");
  } finally {
    clearTimeout(timer);
  }
}
