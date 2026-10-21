"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { submitCddq } from "@/app/actions/compass";
import { GOAL_OPTIONS, ITEMS, SCALE_LABELS, SCALE_MAX, STAGE_OPTIONS } from "@/lib/cddq";
import { FIELD_CATEGORIES } from "@/lib/constants";
import { Consent } from "../Consent";

const DRAFT_KEY = "leftbank:cddq-draft";
type Draft = { items: Record<string, number>; step: number };

function loadDraft(): Draft | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    return raw ? (JSON.parse(raw) as Draft) : null;
  } catch {
    return null;
  }
}
function saveDraft(d: Draft | null) {
  try {
    if (d) localStorage.setItem(DRAFT_KEY, JSON.stringify(d));
    else localStorage.removeItem(DRAFT_KEY);
  } catch {
    // 私密瀏覽等情況，略過草稿
  }
}

/** 第一題還沒作答的位置；全部答完時回傳題數 */
function firstMissing(items: Record<string, number>) {
  const i = ITEMS.findIndex((it) => items[it.id] == null);
  return i === -1 ? ITEMS.length : i;
}

export function CddqRunner({ consentItems }: { consentItems: string[] }) {
  const [consented, setConsented] = useState(false);
  const [step, setStep] = useState(0);
  const [items, setItems] = useState<Record<string, number>>({});
  const [interests, setInterests] = useState<string[]>([]);
  const [stage, setStage] = useState("");
  const [goal, setGoal] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [resume, setResume] = useState<Draft | null>(null);

  useEffect(() => setResume(loadDraft()), []);

  const total = ITEMS.length;
  const onExtras = step >= total;
  const item = ITEMS[Math.min(step, total - 1)];

  // 換題動畫進行中時忽略輸入，避免快速連按把答案記到同一題
  const advancing = useRef(false);
  const answer = useCallback(
    (v: number) => {
      if (advancing.current) return;
      advancing.current = true;
      const next = { ...items, [item.id]: v };
      setItems(next);
      saveDraft({ items: next, step: step + 1 });
      setTimeout(() => {
        setStep((s) => Math.min(s + 1, total));
        advancing.current = false;
      }, 160);
    },
    [items, item, step, total],
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
          <p className="notice">
            你上次已經回答了 {Object.keys(resume.items).length} 題。同意後會從還沒回答的題目繼續。
          </p>
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
        else saveDraft(null);
      });
    };
    return (
      <div className="space-y-10">
        <Progress value={100} label="最後三題" />
        <fieldset>
          <legend className="font-serif text-[22px] font-light">你對哪些領域感興趣？（可複選）</legend>
          <div className="mt-4 flex flex-wrap gap-2">
            {FIELD_CATEGORIES.map((f) => (
              <button
                key={f}
                type="button"
                aria-pressed={interests.includes(f)}
                onClick={() => setInterests((cur) => (cur.includes(f) ? cur.filter((x) => x !== f) : [...cur, f]))}
                className="pill"
              >
                {f}
              </button>
            ))}
          </div>
        </fieldset>
        <fieldset>
          <legend className="font-serif text-[22px] font-light">你目前的階段</legend>
          <div className="mt-4 flex flex-wrap gap-2">
            {STAGE_OPTIONS.map((o) => (
              <button key={o.value} type="button" aria-pressed={stage === o.value} onClick={() => setStage(o.value)} className="pill">
                {o.label}
              </button>
            ))}
          </div>
        </fieldset>
        <fieldset>
          <legend className="font-serif text-[22px] font-light">現在最想解決的一件事</legend>
          <div className="mt-4 flex flex-wrap gap-2">
            {GOAL_OPTIONS.map((o) => (
              <button key={o.value} type="button" aria-pressed={goal === o.value} onClick={() => setGoal(o.value)} className="pill">
                {o.label}
              </button>
            ))}
          </div>
        </fieldset>
        {error && <p className="notice notice-error" role="alert">{error}</p>}
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => setStep(total - 1)} className="btn btn-outline">上一題</button>
          <button type="button" onClick={submit} disabled={pending || !interests.length || !stage || !goal} className="btn btn-stone">
            {pending ? "計算中…" : "看我的羅盤"}
          </button>
        </div>
      </div>
    );
  }

  const current = items[item.id];
  return (
    <div>
      <Progress value={progress} label={`${step + 1} / ${total}`} />
      <p key={item.id} className="display mt-12 min-h-[120px] text-[26px] leading-[1.5] md:mt-16 md:text-[32px]">
        {item.text}
      </p>
      <div className="mt-10" role="radiogroup" aria-label="這句話有多像你">
        <div className="grid grid-cols-9 gap-1.5 md:gap-2">
          {Array.from({ length: SCALE_MAX }, (_, i) => i + 1).map((v) => (
            <button
              key={v}
              type="button"
              role="radio"
              aria-checked={current === v}
              aria-label={`${v} 分`}
              onClick={() => answer(v)}
              className={`aspect-square rounded-full border text-[15px] transition-colors md:text-[16px] ${
                current === v ? "border-stone bg-stone text-white" : "border-silver bg-surface text-stone hover:border-stone"
              }`}
            >
              {v}
            </button>
          ))}
        </div>
        <div className="mt-3 flex justify-between text-[13px] text-ash">
          <span>{SCALE_LABELS.min}</span>
          <span>{SCALE_LABELS.max}</span>
        </div>
      </div>
      <div className="mt-12 flex items-center justify-between">
        <button type="button" onClick={() => setStep(Math.max(0, step - 1))} disabled={step === 0} className="btn btn-sm text-stone disabled:opacity-30">
          ← 上一題
        </button>
        {current != null && (
          <button type="button" onClick={() => setStep(step + 1)} className="btn btn-sm text-stone">下一題 →</button>
        )}
      </div>
      <p className="mt-6 hidden text-center text-[12px] text-mute md:block">也可以直接按鍵盤 1–9 作答</p>
    </div>
  );
}

function Progress({ value, label }: { value: number; label: string }) {
  return (
    <div>
      <div className="flex justify-between text-[13px] text-ash">
        <span>生涯決策困難量表</span>
        <span>{label}</span>
      </div>
      <div className="mt-2 h-1 overflow-hidden rounded-full bg-hairline">
        <div className="h-full rounded-full bg-stone transition-[width] duration-300" style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}
