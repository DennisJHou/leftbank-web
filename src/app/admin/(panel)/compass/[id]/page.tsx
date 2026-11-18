import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/admin-auth";
import { one } from "@/lib/db";
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
import type { AiReport, ChatMessage } from "@/lib/ai";
import type { Diagnosis } from "@/lib/agent/types";
import { latestRun, resolvePlan } from "@/lib/agent/store";
import { ROUTE_LABEL } from "@/lib/agent/copy";
import { fmtDate, PageTitle } from "../../../ui";
import { BackLink } from "@/components/ui";

export const metadata = { title: "個人結果" };

/** 只有超級管理員看得到個人結果 */
export default async function CompassDetail({ params }: PageProps<"/admin/compass/[id]">) {
  await requireAdmin("super");
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const s = await one<{
    kind: "cddq" | "ai";
    created_at: Date;
    consent_at: Date;
    answers: CddqAnswers & { messages?: ChatMessage[] };
    scores: CddqScores | null;
    report: AiReport | null;
    diagnosis: Diagnosis | null;
    name: string;
    email: string;
  }>(
    `select c.kind, c.created_at, c.consent_at, c.answers, c.scores, c.report, c.diagnosis, u.name, u.email
       from compass_sessions c join users u on u.id = c.user_id where c.id = $1`,
    [id],
  );
  if (!s) notFound();
  const cats = Object.keys(CATEGORIES) as CategoryKey[];
  const run = await latestRun(id);
  const plan = run?.result ? await resolvePlan(run.result) : null;

  return (
    <>
      <BackLink href="/admin/compass?view=people">個人結果</BackLink>
      <div className="mt-4">
        <PageTitle title={`${s.name}・${s.kind === "ai" ? "AI 對談" : "量表"}`} lead={`${s.email} · ${fmtDate(s.created_at)} · 同意時間 ${fmtDate(s.consent_at)}`} />
      </div>
      {s.scores && (
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="card p-5">
            <p className="mb-3 font-medium">三大類</p>
            {cats.map((c) => (
              <p key={c} className="flex justify-between py-1 text-meta">
                <span>{CATEGORIES[c].label}</span>
                <span className="tabular-nums">{LEVEL_LABEL[levelOf(s.scores!.categories[c])]} {s.scores!.categories[c].toFixed(2)}</span>
              </p>
            ))}
            <p className="mt-4 text-note text-ash">
              主要困難：{s.scores.top.map((k) => SUBSCALES[k].label).join("、")}
              {!s.scores.validity.ok && "，效度題未通過"}
            </p>
            <p className="mt-2 text-note text-ash">
              興趣：{s.answers.interests?.join("、")}｜階段：{STAGE_OPTIONS.find((o) => o.value === s.answers.stage)?.label}｜想解決：
              {GOAL_OPTIONS.find((o) => o.value === s.answers.goal)?.label}
            </p>
          </div>
          <div className="card p-5">
            <p className="mb-3 font-medium">十個小項</p>
            {SUBSCALE_ORDER.map((k) => (
              <p key={k} className="flex justify-between py-0.5 text-meta">
                <span>{SUBSCALES[k].label}</span>
                <span className="tabular-nums">{s.scores!.subscales[k].toFixed(2)}</span>
              </p>
            ))}
          </div>
        </div>
      )}
      {s.diagnosis && (
        <div className="card mt-6 p-5 text-meta">
          <p className="mb-3 font-medium">診斷與分流（{s.diagnosis.version}）</p>
          <p>
            路徑：{ROUTE_LABEL[s.diagnosis.route].title}｜信心：{s.diagnosis.confidence}｜區辨度：{s.diagnosis.differentiation}｜可信度：
            {s.diagnosis.credibility.ok ? "通過" : s.diagnosis.credibility.reasons.join("、")}
          </p>
          <p className="mt-1 text-note text-ash">
            突出項：{s.diagnosis.salient.map((k) => SUBSCALES[k].label).join("、")}｜個人平均 {s.diagnosis.stats?.mean} · SD {s.diagnosis.stats?.sd} · 44 題 SD {s.diagnosis.stats?.itemSd}
          </p>
        </div>
      )}
      {run && (
        <div className="card mt-6 p-5 text-meta">
          <p className="mb-3 font-medium">
            Agent：{run.status}（第 {run.attempt} 次・{run.model ?? "—"}・${Number(run.cost_usd).toFixed(3)}）
          </p>
          {run.error && <p className="whitespace-pre-line text-note text-error">{run.error}</p>}
          {plan && (
            <div className="space-y-4">
              <p className="font-serif text-item">{plan.overview}</p>
              {plan.focuses.map((f) => (
                <div key={f.subscale} className="border-t border-hairline pt-3">
                  <p className="font-medium">{f.title}（{SUBSCALES[f.subscale].label}）</p>
                  <p>{f.why}</p>
                  <p className="mt-1">行動：{f.action}</p>
                  <p>書寫：{f.writing_prompt}</p>
                  {f.quote && <p className="text-ash">引言（{f.quote.name}）：「{f.quote.text}」</p>}
                  <p className="text-note text-ash">資源：{f.resources.map((r) => r.title).join("、")}｜成分：{f.components.join(", ")}</p>
                </div>
              ))}
            </div>
          )}
          <details className="mt-4">
            <summary className="cursor-pointer text-ash">工具呼叫軌跡</summary>
            <pre className="mt-2 max-h-80 overflow-auto whitespace-pre-wrap bg-panel p-3 text-note">{JSON.stringify(run.trace, null, 2)}</pre>
          </details>
        </div>
      )}
      {s.report && (
        <div className="space-y-6">
          <div className="card p-5">
            <p className="font-serif text-item">{s.report.summary}</p>
            <p className="mt-3 text-note text-ash">
              {cats.map((c) => `${CATEGORIES[c].label}：${LEVEL_LABEL[s.report!.categories[c]]}`).join("｜")}
            </p>
            <ul className="mt-4 space-y-2 text-meta">
              {s.report.focus.map((f, i) => (
                <li key={i}>
                  <b>{f.title}</b>：{f.text}
                </li>
              ))}
            </ul>
            <p className="mt-4 text-note text-ash">標籤：{s.report.tags.map((t) => `${t.label}(${t.weight})`).join("、")}</p>
          </div>
          <details className="card p-5">
            <summary className="cursor-pointer font-medium">對談紀錄</summary>
            <div className="mt-4 space-y-3 text-meta">
              {(s.answers.messages ?? []).map((m, i) => (
                <p key={i} className={m.role === "user" ? "text-ink" : "text-stone"}>
                  <b>{m.role === "user" ? "使用者" : "AI"}：</b>
                  <span className="whitespace-pre-line">{m.content}</span>
                </p>
              ))}
            </div>
          </details>
        </div>
      )}
    </>
  );
}
