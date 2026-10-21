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
    name: string;
    email: string;
  }>(
    `select c.kind, c.created_at, c.consent_at, c.answers, c.scores, c.report, u.name, u.email
       from compass_sessions c join users u on u.id = c.user_id where c.id = $1`,
    [id],
  );
  if (!s) notFound();
  const cats = Object.keys(CATEGORIES) as CategoryKey[];

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
