"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { finishAiSession, sendAiMessage, startAiSession } from "@/app/actions/compass";
import type { ChatMessage } from "@/lib/ai";
import { Consent } from "../Consent";

export function StartAi({ consentItems }: { consentItems: string[] }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="space-y-4">
      <Consent
        items={consentItems}
        cta="同意，開始對談"
        pending={pending}
        onAgree={() =>
          start(async () => {
            const res = await startAiSession();
            if (res?.error) setError(res.error);
          })
        }
      />
      {error && <p className="notice notice-error">{error}</p>}
    </div>
  );
}

export function AiChat({ initial, turnsLeft: initialLeft, maxTurns }: { initial: ChatMessage[]; turnsLeft: number; maxTurns: number }) {
  const [messages, setMessages] = useState(initial);
  const [turnsLeft, setTurnsLeft] = useState(initialLeft);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sending, startSend] = useTransition();
  const [finishing, startFinish] = useTransition();
  const endRef = useRef<HTMLDivElement>(null);
  const userTurns = messages.filter((m) => m.role === "user").length;

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length, sending]);

  const send = () => {
    const text = draft.trim();
    if (!text || sending) return;
    setError(null);
    setMessages((m) => [...m, { role: "user", content: text }]);
    setDraft("");
    startSend(async () => {
      const res = await sendAiMessage(text);
      if (res.error) {
        setError(res.error);
        setDraft(text);
        setMessages(res.messages.length ? res.messages : (m) => m.slice(0, -1));
      } else {
        setMessages(res.messages);
      }
      setTurnsLeft(res.turnsLeft);
    });
  };

  const finish = () =>
    startFinish(async () => {
      const res = await finishAiSession();
      if (res?.error) setError(res.error);
    });

  return (
    <div>
      <div className="space-y-5">
        {messages.map((m, i) => (
          <div key={i} className={m.role === "user" ? "flex justify-end" : "flex"}>
            <div
              className={`rise max-w-[88%] whitespace-pre-line rounded-[22px] px-5 py-4 text-body leading-[1.85] tracking-[0.03em] md:max-w-[80%] ${
                m.role === "user" ? "rounded-tr-md bg-river text-white" : "paper-card rounded-tl-md text-ink"
              }`}
            >
              {m.content}
            </div>
          </div>
        ))}
        {sending && (
          <div className="flex">
            <div className="paper-card rounded-[22px] rounded-tl-md px-5 py-5" aria-label="AI 正在回覆">
              <span className="inline-flex gap-1.5">
                {[0, 1, 2].map((d) => (
                  <span key={d} className="h-1.5 w-1.5 animate-pulse rounded-full bg-river/60" style={{ animationDelay: `${d * 160}ms` }} />
                ))}
              </span>
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      <div className="sticky bottom-0 mt-8 bg-canvas/90 pb-4 pt-3 backdrop-blur-md">
        {error && <p className="notice notice-error mb-3" role="alert">{error}</p>}
        {turnsLeft > 0 ? (
          <div className="flex items-end gap-2 rounded-[26px] border border-line bg-surface p-2 pl-5 transition-colors focus-within:border-river">
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                  e.preventDefault();
                  send();
                }
              }}
              rows={2}
              maxLength={1000}
              placeholder="想到什麼就說什麼…"
              aria-label="你的訊息"
              className="max-h-40 flex-1 resize-none bg-transparent py-2 text-body outline-none"
            />
            <button type="button" onClick={send} disabled={sending || !draft.trim()} className="btn btn-primary btn-sm shrink-0">
              送出
            </button>
          </div>
        ) : (
          <p className="notice">{maxTurns} 輪已用完，請產生報告。</p>
        )}
        <div className="mt-3 flex items-center justify-between gap-4 text-note text-ash">
          <span>剩 {turnsLeft} 輪（共 {maxTurns} 輪）</span>
          <button
            type="button"
            onClick={finish}
            disabled={finishing || sending || userTurns < 2}
            className={`btn btn-sm ${turnsLeft === 0 ? "btn-primary" : ""}`}
          >
            {finishing ? "產生報告中…" : "結束並產生報告"}
          </button>
        </div>
      </div>
    </div>
  );
}
