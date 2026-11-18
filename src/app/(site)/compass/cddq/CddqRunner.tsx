"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { submitCddq } from "@/app/actions/compass";
import { GOAL_OPTIONS, ITEMS, SCALE_LABELS, SCALE_MAX, STAGE_OPTIONS } from "@/lib/cddq";
import { FIELD_CATEGORIES } from "@/lib/constants";
import { Consent } from "../Consent";

// 草稿依帳號分開存，避免共用電腦時看到別人的作答
const draftKey = (userId: string) => `leftbank:cddq-draft:${userId}`;
type Draft = { items: Record<string, number>; step: number };

function loadDraft(key: string): Draft | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as Draft) : null;
  } catch {
    return null;
  }
}
function saveDraft(key: string, d: Draft | null) {
  try {
    if (d) localStorage.setItem(key, JSON.stringify(d));
    else localStorage.removeItem(key);
  } catch {
    // 私密瀏覽等情況，略過草稿
  }
}

/** 第一題還沒作答的位置；全部答完時回傳題數 */
function firstMissing(items: Record<string, number>) {
  const i = ITEMS.findIndex((it) => items[it.id] == null);
  return i === -1 ? ITEMS.length : i;
}

/**
 * trial：不用登入的試用版。略過同意書與附加選擇題，不存草稿、不送出；
 * 全部題目答完後把作答交給 onTrialDone，由外層顯示結果。
 */
export function CddqRunner({
  consentItems,
  userId,
  trial = false,
  onTrialDone,
}: {
  consentItems: string[];
  userId: string;
  trial?: boolean;
  onTrialDone?: (items: Record<string, number>) => void;
}) {
  const key = draftKey(userId);
  const [consented, setConsented] = useState(trial);
  const [items, setItems] = useState<Record<string, number>>({});
  const [interests, setInterests] = useState<string[]>([]);
  const [stage, setStage] = useState("");
  const [goal, setGoal] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [resume, setResume] = useState<Draft | null>(null);
  // 作答時間：給可信度檢查用（作答過快）。續答時不送開始時間，避免把中斷的時間算進去
  const startedAt = useRef<string | null>(null);

  useEffect(() => {
    if (trial) return;
    setResume(loadDraft(key));
    // 移除舊版不分帳號的草稿
    try {
      localStorage.removeItem("leftbank:cddq-draft");
    } catch {}
  }, [key, trial]);

  useEffect(() => {
    if (consented) startedAt.current ??= new Date().toISOString();
  }, [consented]);

  const total = ITEMS.length;
  const answered = ITEMS.filter((it) => items[it.id] != null).length;

  const answer = (id: string, v: number) => setItems((cur) => ({ ...cur, [id]: v }));

  // 草稿跟著作答自動存
  useEffect(() => {
    if (!trial && consented && Object.keys(items).length) saveDraft(key, { items, step: firstMissing(items) });
  }, [items, trial, consented, key]);

  const scrollToMissing = () => {
    const i = firstMissing(items);
    if (i < total) document.getElementById(`item-${ITEMS[i].id}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
    return i < total;
  };

  if (!consented) {
    return (
      <div className="space-y-6">
        {resume && Object.keys(resume.items).length > 0 && (
          <p className="notice">上次已回答 {Object.keys(resume.items).length} 題，同意後會保留這些答案。</p>
        )}
        <Consent
          items={consentItems}
          cta="同意，開始作答"
          onAgree={() => {
            if (resume) setItems(resume.items);
            setConsented(true);
          }}
        />
      </div>
    );
  }

  const submit = () => {
    setError(null);
    if (scrollToMissing()) {
      setError(`還有 ${total - answered} 題沒有作答。`);
      return;
    }
    if (trial) {
      onTrialDone?.(items);
      return;
    }
    start(async () => {
      const res = await submitCddq({
        items,
        interests,
        stage,
        goal,
        consent: true,
        timing: { started_at: resume ? undefined : (startedAt.current ?? undefined) },
      });
      if (res?.error) setError(res.error);
      else saveDraft(key, null);
    });
  };

  return (
    <div className="space-y-12">
      <div className="sticky top-0 z-10 -mx-4 bg-canvas/95 px-4 py-3 backdrop-blur md:-mx-0 md:px-0">
        <Progress value={Math.round((answered / total) * 100)} label={`已作答 ${answered} / ${total}`} />
      </div>
      <p className="text-meta text-ash">
        1 = {SCALE_LABELS.min}，{SCALE_MAX} = {SCALE_LABELS.max}
      </p>

      <ol className="divide-y divide-hairline border-y border-hairline">
        {ITEMS.map((it, i) => {
          const current = items[it.id];
          return (
            <li key={it.id} id={`item-${it.id}`} className="scroll-mt-28 py-7">
              <p className="text-body leading-[1.7] text-ink-strong">
                <span className="mr-2 tabular-nums text-ash">{i + 1}.</span>
                {it.text}
              </p>
              <div className="mt-4 grid grid-cols-9 gap-1.5 md:max-w-xl md:gap-2" role="radiogroup" aria-label={`第 ${i + 1} 題：這句話與你的情況有多相似`}>
                {Array.from({ length: SCALE_MAX }, (_, k) => k + 1).map((v) => (
                  <button
                    key={v}
                    type="button"
                    role="radio"
                    aria-checked={current === v}
                    aria-label={`${v} 分`}
                    onClick={() => answer(it.id, v)}
                    className={`aspect-square rounded-full border text-meta tabular-nums transition-colors ${
                      current === v ? "border-river bg-river text-white" : "border-line bg-surface/80 text-ink hover:border-river hover:text-river"
                    }`}
                  >
                    {v}
                  </button>
                ))}
              </div>
              <div className="mt-2 flex justify-between text-note text-ash md:max-w-xl">
                <span>很不相似</span>
                <span>非常相似</span>
              </div>
            </li>
          );
        })}
      </ol>

      {!trial && (
        <>
          <fieldset>
            <legend className="h-item tracking-[0.08em]">你對哪些領域感興趣？（可複選）</legend>
            <div className="mt-4 flex flex-wrap gap-2">
              {FIELD_CATEGORIES.map((f) => (
                <button
                  key={f}
                  type="button"
                  aria-pressed={interests.includes(f)}
                  onClick={() => setInterests((cur) => (cur.includes(f) ? cur.filter((x) => x !== f) : [...cur, f]))}
                  className="chip"
                >
                  {f}
                </button>
              ))}
            </div>
          </fieldset>
          <fieldset>
            <legend className="h-item tracking-[0.08em]">你目前的階段</legend>
            <div className="mt-4 flex flex-wrap gap-2">
              {STAGE_OPTIONS.map((o) => (
                <button key={o.value} type="button" aria-pressed={stage === o.value} onClick={() => setStage(o.value)} className="chip">
                  {o.label}
                </button>
              ))}
            </div>
          </fieldset>
          <fieldset>
            <legend className="h-item tracking-[0.08em]">現在最想解決的一件事</legend>
            <div className="mt-4 flex flex-wrap gap-2">
              {GOAL_OPTIONS.map((o) => (
                <button key={o.value} type="button" aria-pressed={goal === o.value} onClick={() => setGoal(o.value)} className="chip">
                  {o.label}
                </button>
              ))}
            </div>
          </fieldset>
        </>
      )}

      {error && <p className="notice notice-error" role="alert">{error}</p>}
      <button
        type="button"
        onClick={submit}
        disabled={pending || (!trial && (!interests.length || !stage || !goal))}
        className="btn btn-primary"
      >
        {pending ? "計算中…" : "查看結果"}
      </button>
    </div>
  );
}

function Progress({ value, label }: { value: number; label: string }) {
  return (
    <div>
      <div className="flex justify-end text-note tracking-[0.06em] text-ash">
        <span>{label}</span>
      </div>
      <div className="mt-2 h-[3px] overflow-hidden rounded-full bg-hairline">
        <div className="h-full rounded-full bg-river transition-[width] duration-300" style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}
