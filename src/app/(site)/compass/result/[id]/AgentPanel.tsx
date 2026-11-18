"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { retryAgent } from "@/app/actions/compass";
import { SUBSCALES } from "@/lib/cddq";
import { COMPONENT_LABEL, FALLBACK_TEXT, STEP_LABELS, STEP_ORDER } from "@/lib/agent/copy";
import { EVIDENCE_LABEL, EVIDENCE_TEXT, type Evidence } from "@/lib/diagnosis-config";
import type { AgentStatusPayload, ResolvedPlan } from "@/lib/agent/types";
import { renderPlanImage, type PlanImageMeta } from "@/components/compass/planImage";
import { Arrow } from "@/components/ui";

const WASHES = ["#ebcabd", "#f0d9a5", "#cfd9bf"];
const NUMERALS = ["一", "二", "三"];
const POLL_MS = 2000;

/**
 * 處置包面板：Agent 執行中時每 2 秒輪詢進度；完成後顯示處置包；
 * 失敗、略過時顯示 fallback（由伺服器端渲染好的固定推薦）。
 */
export function AgentPanel({
  sessionId,
  initial,
  imageMeta,
  fallback,
}: {
  sessionId: string;
  initial: AgentStatusPayload;
  imageMeta: PlanImageMeta;
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
    return <PlanView plan={state.plan} imageMeta={imageMeta} />;
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
    </div>
  );
}

function Progress({ state }: { state: AgentStatusPayload }) {
  const steps = STEP_ORDER.map((k) => state.steps.find((s) => s.key === k) ?? { key: k, status: "pending" as const });
  return (
    <div className="paper-card p-6 md:p-10" aria-live="polite">
      <p className="h-item tracking-[0.08em]">正在為你整理</p>
      <p className="mt-1 text-meta text-ash">大約需要 30–90 秒，可以先往上看看你的羅盤。這段時間不用重新整理頁面。</p>
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

function PlanView({ plan, imageMeta }: { plan: ResolvedPlan; imageMeta: PlanImageMeta }) {
  const evidences = [...new Set(plan.focuses.flatMap((f) => f.resources.map((r) => r.evidence)))] as Evidence[];
  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-6">
        <p className="prose-airy max-w-3xl">{plan.overview}</p>
        <SaveImage plan={plan} meta={imageMeta} />
      </div>

      <div className="mt-12 space-y-14">
        {plan.focuses.map((f, i) => (
          <article key={f.subscale} className="grid gap-8 border-t border-hairline pt-10 lg:grid-cols-[1fr_1fr] lg:gap-14">
            <div>
              <div className="flex items-center gap-4">
                <span className="numeral h-11 w-11 text-[1.125rem]" style={{ background: WASHES[i % 3] }} aria-hidden>
                  {NUMERALS[i] ?? i + 1}
                </span>
                <div>
                  <h3 className="h-section tracking-[0.08em]">{f.title}</h3>
                  <p className="text-note text-ash">
                    {SUBSCALES[f.subscale].label}
                    {f.changed && <span className="ml-2 text-accent">這次新出現</span>}
                  </p>
                </div>
              </div>
              <p className="prose-airy mt-5">{f.why}</p>
              {f.quote && (
                <figure className="mt-7 border-l-[3px] border-hairline pl-5">
                  <blockquote className="text-tagline">「{f.quote.text}」</blockquote>
                  <figcaption className="mt-3 text-note text-ash">
                    —{" "}
                    <Link href={`/alumni/${f.quote.alumniId}`} className="underline underline-offset-4 hover:text-ink">
                      {f.quote.name}
                    </Link>
                    {f.quote.title && `，${f.quote.title}`}
                  </figcaption>
                </figure>
              )}
            </div>
            <div className="space-y-6">
              <div className="paper-card p-5 md:p-6">
                <p className="text-note font-medium tracking-[0.06em] text-chart">這週可以做的一件事</p>
                <p className="mt-2 text-body text-ink-strong">{f.action}</p>
              </div>
              <div className="paper-card p-5 md:p-6">
                <p className="text-note font-medium tracking-[0.06em] text-chart">書寫練習</p>
                <p className="mt-2 text-body text-ink-strong">{f.writing_prompt}</p>
              </div>
              {f.resources.length > 0 && (
                <ul className="space-y-3">
                  {f.resources.map((r) => (
                    <li key={r.id}>
                      <a
                        href={r.url}
                        target={r.url.startsWith("/") ? undefined : "_blank"}
                        rel={r.url.startsWith("/") ? undefined : "noreferrer"}
                        className="group block border-b border-hairline pb-3"
                      >
                        <span className="link-arrow">
                          {r.title} <Arrow />
                        </span>
                        <span className="mt-1 block text-note text-ash">
                          {r.provider}・{r.summary}
                        </span>
                      </a>
                    </li>
                  ))}
                </ul>
              )}
              <p className="flex flex-wrap gap-1.5 text-note text-ash">
                {f.components.map((c) => (
                  <span key={c} className="border border-hairline px-2 py-0.5">{COMPONENT_LABEL[c]}</span>
                ))}
              </p>
            </div>
          </article>
        ))}
      </div>

      <details className="mt-12 border-t border-hairline pt-6 text-meta">
        <summary className="cursor-pointer text-ash hover:text-ink">這些建議依據哪類研究？</summary>
        <div className="mt-4 max-w-3xl space-y-3 text-ash">
          <p>
            整合分析發現，有效的生涯介入通常包含：個別化解釋、職業世界資訊、書寫練習、看見榜樣、支持網絡、有人陪談、價值澄清、做決定的方法；結合 3 種以上的效果較好，而且最好有人陪著，不只是看網站。每個焦點下方的標籤，就是這次用到的成分。
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

function SaveImage({ plan, meta }: { plan: ResolvedPlan; meta: PlanImageMeta }) {
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
      const blob = await renderPlanImage(plan, meta);
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
