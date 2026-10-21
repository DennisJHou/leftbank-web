"use client";

import { useActionState, useState, useTransition } from "react";
import { deleteStory, saveStory } from "@/app/actions/story";
import { FormMessage, SubmitButton } from "@/components/forms";
import {
  STORY_FREE,
  STORY_MIN_OPTIONAL,
  STORY_QUESTIONS,
  STORY_SUGGESTED,
  TAGLINE_MAX,
  type StoryAnswers,
} from "@/lib/story-questions";

function Counter({ n }: { n: number }) {
  const { min, max } = STORY_SUGGESTED;
  const tone = n === 0 ? "text-mute" : n < min ? "text-ochre" : n > max ? "text-ochre" : "text-sage-mute";
  return (
    <span className={`text-[12px] ${tone}`}>
      {n} 字{n > 0 && n < min && `・建議 ${min} 字以上`}
      {n > max && `・建議 ${max} 字以內`}
    </span>
  );
}

export function StoryEditor({ initial, hasStory }: { initial: { tagline: string; answers: StoryAnswers }; hasStory: boolean }) {
  const [state, action] = useActionState(saveStory, undefined);
  const [answers, setAnswers] = useState<StoryAnswers>(initial.answers);
  const [tagline, setTagline] = useState(initial.tagline);
  const [open, setOpen] = useState<Set<string>>(
    () => new Set(STORY_QUESTIONS.filter((q) => q.required || initial.answers[q.key]).map((q) => q.key)),
  );
  const [deleting, startDelete] = useTransition();
  const optionalDone = STORY_QUESTIONS.filter((q) => !q.required && answers[q.key]?.trim()).length;

  const set = (k: keyof StoryAnswers, v: string) => setAnswers((a) => ({ ...a, [k]: v }));
  const toggle = (k: string) =>
    setOpen((s) => {
      const n = new Set(s);
      if (n.has(k)) n.delete(k);
      else n.add(k);
      return n;
    });

  return (
    <form action={action} className="space-y-10">
      <div>
        <label className="field-label" htmlFor="tagline">一句話</label>
        <input
          id="tagline"
          name="tagline"
          value={tagline}
          onChange={(e) => setTagline(e.target.value)}
          maxLength={TAGLINE_MAX}
          required
          placeholder="例如：實驗設計教會我的，是怎麼好好問一個問題。"
          className="input font-serif text-[18px]"
        />
        <p className="field-hint">會出現在首頁的故事卡上，當作你的金句。{tagline.length}/{TAGLINE_MAX}</p>
      </div>

      <div>
        <div className="flex items-baseline justify-between gap-4">
          <p className="field-label !mb-0">題目</p>
          <p className={`text-[13px] ${optionalDone >= STORY_MIN_OPTIONAL ? "text-sage-mute" : "text-ash"}`}>
            第 3 題必答，其他已回答 {optionalDone} 題（至少 {STORY_MIN_OPTIONAL} 題）
          </p>
        </div>
        <p className="mt-1 text-[13px] text-ash">
          每題建議 {STORY_SUGGESTED.min}–{STORY_SUGGESTED.max} 字，只是參考，不強制。點題目展開作答。
        </p>
        <div className="mt-5 space-y-3">
          {STORY_QUESTIONS.map((q, i) => {
            const isOpen = open.has(q.key);
            const n = answers[q.key]?.trim().length ?? 0;
            return (
              <div key={q.key} className={`rounded-[20px] border bg-surface ${isOpen ? "border-silver" : "border-hairline"}`}>
                <button
                  type="button"
                  onClick={() => !q.required && toggle(q.key)}
                  aria-expanded={isOpen}
                  className="flex w-full items-start gap-3 px-5 py-4 text-left"
                >
                  <span className="mt-0.5 w-5 shrink-0 font-serif text-[15px] text-ash">{i + 1}</span>
                  <span className="flex-1 text-[15px] leading-relaxed">
                    {q.text}
                    {q.required && <span className="ml-2 chip">必答</span>}
                  </span>
                  {!q.required && (
                    <span className="mt-0.5 shrink-0 text-[13px] text-ash">{n ? "✓" : isOpen ? "收起" : "作答"}</span>
                  )}
                </button>
                <div className={isOpen ? "px-5 pb-5" : "hidden"}>
                  <textarea
                    name={q.key}
                    value={answers[q.key] ?? ""}
                    onChange={(e) => set(q.key, e.target.value)}
                    rows={7}
                    required={q.required}
                    className="input"
                  />
                  <div className="mt-1.5 text-right">
                    <Counter n={n} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div>
        <label className="field-label" htmlFor="free">{STORY_FREE.text}（選填）</label>
        <textarea id="free" name="free" value={answers.free ?? ""} onChange={(e) => set("free", e.target.value)} rows={5} className="input" />
      </div>

      <FormMessage state={state} />
      <div className="flex flex-wrap items-center gap-3">
        <SubmitButton className="btn btn-stone" pending="發布中…">{hasStory ? "更新故事" : "發布故事"}</SubmitButton>
        {hasStory && (
          <button
            type="button"
            disabled={deleting}
            onClick={() => {
              if (confirm("確定要刪除你的故事嗎？刪除後無法復原。")) startDelete(() => void deleteStory());
            }}
            className="btn text-ash hover:text-error"
          >
            {deleting ? "刪除中…" : "刪除故事"}
          </button>
        )}
      </div>
      <p className="text-[13px] text-ash">送出就會直接發布，之後隨時可以回來編輯。</p>
    </form>
  );
}
