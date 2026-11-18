"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { retryAgent } from "@/app/actions/compass";
import { SUBSCALES } from "@/lib/cddq";
import { FALLBACK_TEXT, STEP_LABELS, STEP_ORDER } from "@/lib/agent/copy";
import { EVIDENCE_LABEL, EVIDENCE_TEXT, type Evidence } from "@/lib/diagnosis-config";
import type { AgentStatusPayload, PlanAlumni, ResolvedPlan } from "@/lib/agent/types";
import { renderPlanImage, type PlanImageMeta } from "@/components/compass/planImage";

const NUMERALS = ["一", "二", "三"];
const POLL_MS = 2000;

/**
 * 處置包面板：Agent 執行中時每 2 秒輪詢進度；完成後顯示處置包；
 * 失敗、略過時顯示 fallback（由伺服器端渲染好的固定推薦）。推薦系友兩種情況都顯示在最後。
 */
export function AgentPanel({
  sessionId,
  initial,
  imageMeta,
  alumni,
  fallback,
}: {
  sessionId: string;
  initial: AgentStatusPayload;
  imageMeta: PlanImageMeta;
  alumni: PlanAlumni[];
  fallback: React.ReactNode;
}) {
  const [state, setState] = useState(initial);
  const [retrying, startRetry] = useTransition();
  const [retryError, setRetryError] = useState<string | null>(null);
  const live = state.status === "queued" || state.status === "running";

  useEffect(() => {
    if (!live) return;
    let stop = false;
    const tick = async () => {
      try {
        const res = await fetch(`/api/agent/status/${sessionId}`, { cache: "no-store" });
        if (res.ok && !stop) setState(await res.json());
      } catch {
        // 網路暫時中斷就下次再試
      }
    };
    const t = setInterval(tick, POLL_MS);
    return () => {
      stop = true;
      clearInterval(t);
    };
  }, [live, sessionId]);

  if (live) return <Progress state={state} />;

  if (state.status === "succeeded" && state.plan) {
    return <PlanView plan={state.plan} imageMeta={imageMeta} alumni={alumni} />;
  }

  return (
    <div>
      {(state.status === "failed" || state.status === "fallback") && (
        <div className="notice mb-10 flex flex-wrap items-center justify-between gap-4">
          <span>{FALLBACK_TEXT}</span>
          {state.canRetry && (
            <button
              type="button"
              className="btn btn-sm"
              disabled={retrying}
              onClick={() =>
                startRetry(async () => {
                  setRetryError(null);
                  const r = await retryAgent(sessionId);
                  if ("error" in r) setRetryError(r.error);
                  else setState({ status: "queued", steps: [], plan: null, canRetry: false });
                })
              }
            >
              {retrying ? "重新整理中…" : "再試一次"}
            </button>
          )}
          {retryError && <span className="w-full text-note text-error">{retryError}</span>}
        </div>
      )}
      {fallback}
      <AlumniList alumni={alumni} />
    </div>
  );
}

function Progress({ state }: { state: AgentStatusPayload }) {
  const steps = STEP_ORDER.map((k) => state.steps.find((s) => s.key === k) ?? { key: k, status: "pending" as const });
  return (
    <div className="paper-card p-6 md:p-10" aria-live="polite">
      <p className="h-item tracking-[0.08em]">正在為你整理</p>
      <p className="mt-1 text-meta text-ash">大約需要 30–90 秒，會上網查臺大與校外的資訊。可以先往上看看你的羅盤，不用重新整理頁面。</p>
      <ol className="mt-8 space-y-5">
        {steps.map((s, i) => (
          <li key={s.key} className="flex items-center gap-4">
            <span
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-note tabular-nums ${
                s.status === "done"
                  ? "border-river bg-river text-white"
                  : s.status === "active"
                    ? "agent-pulse border-river text-river"
                    : "border-line text-ash"
              }`}
              aria-hidden
            >
              {s.status === "done" ? "✓" : i + 1}
            </span>
            <span className={s.status === "pending" ? "text-ash" : "text-ink-strong"}>
              {STEP_LABELS[s.key]}
              {s.status === "active" && <span className="ml-1 text-ash">…</span>}
              <span className="sr-only">{s.status === "done" ? "（完成）" : s.status === "active" ? "（進行中）" : ""}</span>
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}

/** 一條建議：左邊是標籤，右邊是內容。整份處置包只用這一種排版。 */
function Item({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <li className="grid gap-1 py-4 md:grid-cols-[9rem_1fr] md:gap-6">
      <span className="text-meta font-medium text-river">{label}</span>
      <div className="text-body leading-[1.8] text-ink-strong">{children}</div>
    </li>
  );
}

const external = (url: string) => (url.startsWith("/") ? {} : { target: "_blank", rel: "noreferrer" });

function PlanView({ plan, imageMeta, alumni }: { plan: ResolvedPlan; imageMeta: PlanImageMeta; alumni: PlanAlumni[] }) {
  const evidences = [...new Set(plan.focuses.flatMap((f) => f.resources.map((r) => r.evidence)))] as Evidence[];
  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-6">
        <p className="prose-airy max-w-3xl">{plan.overview}</p>
        <SaveImage plan={plan} meta={imageMeta} alumni={alumni} />
      </div>

      {plan.focuses.map((f, i) => (
        <section key={f.subscale} className="mt-12 border-t border-hairline pt-8">
          <h3 className="h-section tracking-[0.08em]">
            {NUMERALS[i] ?? i + 1}、{f.title}
            {f.changed && <span className="ml-3 align-middle text-note text-accent">這次新出現</span>}
          </h3>
          {f.title !== SUBSCALES[f.subscale].label && <p className="mt-1 text-note text-ash">{SUBSCALES[f.subscale].label}</p>}
          <p className="prose-airy mt-4 max-w-3xl text-ash">{f.why}</p>

          <ul className="mt-4 divide-y divide-hairline border-y border-hairline">
            <Item label="這週做一件事">{f.action}</Item>
            {f.links.map((l) => (
              <Item key={l.url} label={l.campus ? "查資料・校內" : "查資料・校外"}>
                <a href={l.url} target="_blank" rel="noreferrer" className="underline underline-offset-4 hover:text-river">
                  {l.title}
                </a>
                <span className="block text-meta text-ash">{l.note}</span>
              </Item>
            ))}
            {f.resources.map((r) => (
              <Item key={r.id} label="可以使用的資源">
                <a href={r.url} {...external(r.url)} className="underline underline-offset-4 hover:text-river">
                  {r.title}
                </a>
                <span className="block text-meta text-ash">
                  {r.provider}・{r.summary}
                </span>
              </Item>
            ))}
            <Item label="寫下來">{f.writing_prompt}</Item>
            {f.quote && (
              <Item label="系友故事">
                「{f.quote.text}」
                <span className="block text-meta text-ash">
                  —{" "}
                  <Link href={`/alumni/${f.quote.alumniId}`} className="underline underline-offset-4 hover:text-river">
                    {f.quote.name}
                  </Link>
                  {f.quote.title && `，${f.quote.title}`}・點名字讀完整故事
                </span>
              </Item>
            )}
          </ul>
        </section>
      ))}

      <AlumniList alumni={alumni} />

      <details className="mt-12 border-t border-hairline pt-6 text-meta">
        <summary className="cursor-pointer text-ash hover:text-ink">這些建議依據哪類研究？</summary>
        <div className="mt-4 max-w-3xl space-y-3 text-ash">
          <p>
            整合分析發現，有效的生涯介入通常包含：個別化解釋、職業世界資訊、書寫練習、看見榜樣、支持網絡、有人陪談、價值澄清、做決定的方法；結合 3 種以上的效果較好，而且最好有人陪著，不只是看網站。
          </p>
          <ul className="space-y-1">
            {(["direct", "inferred", "preliminary"] as Evidence[]).map((e) => (
              <li key={e} className={evidences.includes(e) ? "text-ink" : ""}>
                【{EVIDENCE_LABEL[e]}】{EVIDENCE_TEXT[e]}
              </li>
            ))}
          </ul>
          <p>目前沒有研究直接證明「依困難類型配對」一定比通用的建議更好，所以這份處置包是依有效成分推論出來的建議，不是唯一答案。</p>
        </div>
      </details>
    </div>
  );
}

/** 推薦的系友：和處置包同一種條列 */
function AlumniList({ alumni }: { alumni: PlanAlumni[] }) {
  if (!alumni.length) return null;
  return (
    <section className="mt-12 border-t border-hairline pt-8">
      <h3 className="h-section tracking-[0.08em]">推薦你聯絡的系友</h3>
      <p className="mt-1 text-meta text-ash">依你的結果與興趣配對，他們都願意回答學弟妹的問題。</p>
      <ul className="mt-4 divide-y divide-hairline border-y border-hairline">
        {alumni.map((a) => (
          <Item key={a.id} label={a.name}>
            {a.title && <span className="block">{a.title}</span>}
            {a.tagline && <span className="block text-meta text-ash">「{a.tagline}」</span>}
            <span className="mt-1 flex flex-wrap gap-x-5 text-meta">
              <Link href={`/alumni/${a.id}`} className="underline underline-offset-4 hover:text-river">讀他的故事</Link>
              {a.accept_question && (
                <Link href={`/alumni/${a.id}/contact?type=question`} className="underline underline-offset-4 hover:text-river">線上提問</Link>
              )}
              {a.accept_coffee && (
                <Link href={`/alumni/${a.id}/contact?type=coffee`} className="underline underline-offset-4 hover:text-river">約咖啡</Link>
              )}
            </span>
          </Item>
        ))}
      </ul>
    </section>
  );
}

function SaveImage({ plan, meta, alumni }: { plan: ResolvedPlan; meta: PlanImageMeta; alumni: PlanAlumni[] }) {
  const [url, setUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const blobRef = useRef<Blob | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const filename = `左岸處置包-${meta.date.replace(/\D/g, "")}.png`;

  useEffect(() => () => void (url && URL.revokeObjectURL(url)), [url]);

  const open = async () => {
    setErr(null);
    setBusy(true);
    try {
      const blob = await renderPlanImage(plan, meta, alumni);
      blobRef.current = blob;
      setUrl((old) => {
        if (old) URL.revokeObjectURL(old);
        return URL.createObjectURL(blob);
      });
      dialog.current?.showModal();
    } catch (e) {
      console.error(e);
      setErr("圖片產生失敗，可以直接用手機截圖。");
    } finally {
      setBusy(false);
    }
  };

  const file = () => (blobRef.current ? new File([blobRef.current], filename, { type: "image/png" }) : null);
  const canShare = typeof navigator !== "undefined" && "canShare" in navigator;

  return (
    <div className="shrink-0">
      <button type="button" className="btn" onClick={open} disabled={busy}>
        {busy ? "產生中…" : "存成圖片"}
      </button>
      {err && <p className="mt-2 text-note text-error">{err}</p>}
      <dialog
        ref={dialog}
        className="m-auto max-h-[92dvh] w-[min(92vw,560px)] overflow-hidden bg-canvas p-0 shadow-[var(--shadow-float)] backdrop:bg-black/40"
        onClick={(e) => e.target === dialog.current && dialog.current?.close()}
      >
        <div className="flex items-center justify-between gap-3 border-b border-hairline px-5 py-3">
          <p className="text-meta text-ink-strong">處置包圖片</p>
          <button type="button" className="btn-text text-meta" onClick={() => dialog.current?.close()}>
            關閉
          </button>
        </div>
        <div className="max-h-[calc(92dvh-8.5rem)] overflow-y-auto bg-panel p-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {url && <img src={url} alt="處置包的圖片版" className="mx-auto w-full shadow-[var(--shadow-float)]" />}
        </div>
        <div className="flex flex-wrap items-center justify-end gap-3 border-t border-hairline px-5 py-3">
          <p className="mr-auto text-note text-ash">手機上也可以長按圖片儲存</p>
          {canShare && (
            <button
              type="button"
              className="btn btn-sm"
              onClick={async () => {
                const f = file();
                if (f && navigator.canShare?.({ files: [f] })) await navigator.share({ files: [f], title: "我的處置包" }).catch(() => {});
              }}
            >
              分享
            </button>
          )}
          {url && (
            <a href={url} download={filename} className="btn btn-primary btn-sm">
              下載圖片
            </a>
          )}
        </div>
      </dialog>
    </div>
  );
}
