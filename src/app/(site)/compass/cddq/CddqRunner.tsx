"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
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
  const [step, setStep] = useState(0);
  const [items, setItems] = useState<Record<string, number>>({});
  const [interests, setInterests] = useState<string[]>([]);
  const [stage, setStage] = useState("");
  const [goal, setGoal] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [resume, setResume] = useState<Draft | null>(null);

  useEffect(() => {
    if (trial) return;
    setResume(loadDraft(key));
    // 移除舊版不分帳號的草稿
    try {
      localStorage.removeItem("leftbank:cddq-draft");
    } catch {}
  }, [key, trial]);

  const total = ITEMS.length;
  const onExtras = step >= total;
  const item = ITEMS[Math.min(step, total - 1)];

  useEffect(() => {
    if (trial && onExtras) onTrialDone?.(items);
  }, [trial, onExtras, items, onTrialDone]);

  // 換題動畫進行中時忽略輸入，避免快速連按把答案記到同一題
  const advancing = useRef(false);
  const answer = useCallback(
    (v: number) => {
      if (advancing.current) return;
      advancing.current = true;
      const next = { ...items, [item.id]: v };
      setItems(next);
      if (!trial) saveDraft(key, { items: next, step: step + 1 });
      setTimeout(() => {
        setStep((s) => Math.min(s + 1, total));
        advancing.current = false;
      }, 160);
    },
    [items, item, step, total, key, trial],
  );

  // 鍵盤 1–9 作答
  useEffect(() => {
    if (!consented || onExtras) return;
    const h = (e: KeyboardEvent) => {
      const n = Number(e.key);
      if (n >= 1 && n <= SCALE_MAX) answer(n);
      if (e.key === "ArrowLeft" && step > 0) setStep(step - 1);
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [consented, onExtras, answer, step]);

  if (!consented) {
    return (
      <div className="space-y-6">
        {resume && Object.keys(resume.items).length > 0 && (
          <p className="notice">上次已回答 {Object.keys(resume.items).length} 題，同意後會從未作答的題目繼續。</p>
        )}
        <Consent
          items={consentItems}
          cta="同意，開始作答"
          onAgree={() => {
            if (resume) {
              setItems(resume.items);
              setStep(firstMissing(resume.items));
            }
            setConsented(true);
          }}
        />
      </div>
    );
  }

  const progress = Math.round((Math.min(step, total) / total) * 100);

  if (trial && onExtras) return null;

  if (onExtras) {
    const submit = () => {
      setError(null);
      const missing = firstMissing(items);
      if (missing < total) {
        setStep(missing);
        return;
      }
      start(async () => {
        const res = await submitCddq({ items, interests, stage, goal, consent: true });
        if (res?.error) setError(res.error);
        else saveDraft(key, null);
      });
    };
    return (
      <div className="space-y-10">
        <Progress value={100} label="最後三題" />
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
        {error && <p className="notice notice-error" role="alert">{error}</p>}
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => setStep(total - 1)} className="btn-pill">上一題</button>
          <button type="button" onClick={submit} disabled={pending || !interests.length || !stage || !goal} className="btn-pill btn-pill-solid">
            {pending ? "計算中…" : "查看結果"}
          </button>
        </div>
      </div>
    );
  }

  const current = items[item.id];
  return (
    <div>
      <Progress value={progress} label={`${step + 1} / ${total}`} />
      {/* key 換題時重新掛載，讓 .rise 每題都浮現一次 */}
      <p key={item.id} className="rise mt-12 min-h-[120px] font-serif text-section leading-[1.6] tracking-[0.06em] text-ink-strong md:mt-16">
        {item.text}
      </p>
      <div className="mt-10" role="radiogroup" aria-label="這句話與你的情況有多相似">
        <div className="grid grid-cols-9 gap-1.5 md:gap-2">
          {Array.from({ length: SCALE_MAX }, (_, i) => i + 1).map((v) => (
            <button
              key={v}
              type="button"
              role="radio"
              aria-checked={current === v}
              aria-label={`${v} 分`}
              onClick={() => answer(v)}
              className={`aspect-square rounded-full border text-meta tabular-nums transition-colors ${
                current === v ? "border-river bg-river text-white" : "border-line bg-surface/80 text-ink hover:border-river hover:text-river"
              }`}
            >
              {v}
            </button>
          ))}
        </div>
        <div className="mt-3 flex justify-between text-note text-ash">
          <span>{SCALE_LABELS.min}</span>
          <span>{SCALE_LABELS.max}</span>
        </div>
      </div>
      <div className="mt-12 flex items-center justify-between">
        <button type="button" onClick={() => setStep(Math.max(0, step - 1))} disabled={step === 0} className="btn btn-text">
          上一題
        </button>
        {current != null && (
          <button type="button" onClick={() => setStep(step + 1)} className="btn btn-text">下一題</button>
        )}
      </div>
      <p className="mt-6 hidden text-center text-note text-ash md:block">可以直接按鍵盤 1–9 作答</p>
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
