"use client";

import { useActionState, useState } from "react";
import { sendContactRequest } from "@/app/actions/alumni";
import { FormMessage, SubmitButton } from "@/components/forms";
import { INTRO_MIN, type ContactType } from "@/lib/constants";

export function ContactForm({ alumniId, type, email }: { alumniId: string; type: ContactType; email: string }) {
  const [state, action] = useActionState(sendContactRequest, undefined);
  const [intro, setIntro] = useState("");
  const [count, setCount] = useState(type === "coffee" ? 3 : 1);
  const coffee = type === "coffee";

  return (
    <form action={action} className="space-y-10">
      <input type="hidden" name="alumni_id" value={alumniId} />
      <input type="hidden" name="type" value={type} />

      <div>
        <label className="field-label" htmlFor="intro">自我介紹</label>
        <textarea
          id="intro"
          name="intro"
          rows={5}
          required
          minLength={INTRO_MIN}
          maxLength={800}
          value={intro}
          onChange={(e) => setIntro(e.target.value)}
          placeholder="你是誰、目前在哪個階段、為什麼想找這位系友。"
          className="input"
        />
        <p className="field-hint">{intro.length} 字，至少 {INTRO_MIN} 字</p>
      </div>

      <fieldset>
        <legend className="field-label">{coffee ? "3 個具體的問題" : "問題（1 到 3 個）"}</legend>
        <div className="space-y-3">
          {Array.from({ length: count }, (_, i) => (
            <div key={i} className="flex items-start gap-3">
              <span className="mt-3 w-5 shrink-0 text-right text-meta text-ash">{i + 1}.</span>
              <textarea name="question" rows={2} required={coffee || i === 0} maxLength={300} className="input" />
            </div>
          ))}
        </div>
        {!coffee && count < 3 && (
          <button type="button" onClick={() => setCount(count + 1)} className="btn-pill btn-pill-sm ml-8 mt-3">
            再加一個問題
          </button>
        )}
      </fieldset>

      {coffee && (
        <>
          <fieldset>
            <legend className="field-label">見面方式</legend>
            <div className="flex flex-wrap gap-2">
              {[
                ["in_person", "實體"],
                ["online", "線上"],
                ["either", "都可以"],
              ].map(([v, label]) => (
                <label key={v} className="chip">
                  <input type="radio" name="mode" value={v} defaultChecked={v === "either"} className="sr-only" />
                  {label}
                </label>
              ))}
            </div>
          </fieldset>
          <div>
            <label className="field-label" htmlFor="availability">方便的時段</label>
            <textarea id="availability" name="availability" rows={2} required maxLength={300} placeholder="例如：平日晚上 7 點後、週六下午" className="input" />
          </div>
          <label className="flex items-start gap-3 text-meta">
            <input type="checkbox" name="gift" required className="checkbox mt-0.5" />
            見面時，我會以 200 元內的實物（例如一杯咖啡）向系友致意。
          </label>
        </>
      )}

      <p className="text-meta text-ash">系友會直接回信到 {email}；系友的 email 不會出現在網站上。</p>
      <FormMessage state={state} />
      <SubmitButton className="btn-pill btn-pill-solid" pending="送出中…">
        送出{coffee ? "邀請" : "提問"}
      </SubmitButton>
    </form>
  );
}
