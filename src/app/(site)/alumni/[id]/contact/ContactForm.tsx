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
    <form action={action} className="space-y-7">
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
          placeholder="你是誰、目前在哪個階段、為什麼想找這位系友聊聊。"
          className="input"
        />
        <p className="field-hint">{intro.length} 字（至少 {INTRO_MIN} 字）</p>
      </div>

      <fieldset>
        <legend className="field-label">{coffee ? "3 個具體的問題" : "想請教的問題（1–3 個）"}</legend>
        <p className="mb-3 text-[13px] text-ash">越具體，越容易得到有用的回答。例如「從研究所轉到業界時，作品集怎麼準備？」</p>
        <div className="space-y-3">
          {Array.from({ length: count }, (_, i) => (
            <div key={i} className="flex items-start gap-3">
              <span className="mt-3 w-5 shrink-0 text-right font-serif text-[15px] text-ash">{i + 1}.</span>
              <textarea name="question" rows={2} required={coffee || i === 0} maxLength={300} className="input" />
            </div>
          ))}
        </div>
        {!coffee && count < 3 && (
          <button type="button" onClick={() => setCount(count + 1)} className="btn btn-outline btn-sm mt-3 ml-8">
            ＋ 再加一個問題
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
                <label key={v} className="pill has-[:checked]:border-stone has-[:checked]:bg-stone has-[:checked]:text-white">
                  <input type="radio" name="mode" value={v} defaultChecked={v === "either"} className="sr-only" />
                  {label}
                </label>
              ))}
            </div>
          </fieldset>
          <div>
            <label className="field-label" htmlFor="availability">方便的時段</label>
            <textarea
              id="availability"
              name="availability"
              rows={2}
              required
              maxLength={300}
              placeholder="例如：平日晚上 7 點後、週六下午；實體可以約在系館附近。"
              className="input"
            />
          </div>
          <label className="flex items-start gap-3 rounded-[16px] bg-surface p-4 text-[14px] leading-relaxed text-stone">
            <input type="checkbox" name="gift" required className="mt-1 h-4 w-4 shrink-0 accent-[#4a4741]" />
            我了解：依照左岸計畫的約定，見面時我會以 200 元內的實物（例如一杯咖啡或小點心）向系友致意。
          </label>
        </>
      )}

      <p className="text-[14px] leading-relaxed text-ash">
        送出後，我們會把你的訊息寄給系友。系友若決定聯絡你，會直接回信到 <span className="text-stone">{email}</span>；
        系友的 email 不會出現在網站上。
      </p>
      <FormMessage state={state} />
      <SubmitButton className="btn btn-stone w-full md:w-auto" pending="送出中…">
        送出{coffee ? "邀請" : "提問"}
      </SubmitButton>
    </form>
  );
}
