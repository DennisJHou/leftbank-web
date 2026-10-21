"use client";

import { useActionState, useRef, useTransition } from "react";
import { removeHeroImage, saveSiteContent, uploadHeroImage } from "../../actions";
import { FormMessage, SubmitButton } from "@/components/forms";
import { resizeImage } from "@/lib/resize-image";

type Field = { key: string; label: string; rows?: number; hint?: string };

const GROUPS: { title: string; fields: Field[] }[] = [
  {
    title: "主視覺",
    fields: [
      { key: "hero.eyebrow", label: "小標" },
      { key: "hero.tagline", label: "標語", rows: 2, hint: "換行會照樣顯示。" },
      { key: "hero.lead", label: "說明文字", rows: 3 },
    ],
  },
  {
    title: "關於計畫",
    fields: [
      { key: "about.title", label: "標題" },
      { key: "about.spirit", label: "計畫理念（左岸精神）", rows: 8, hint: "空一行會分成新段落。" },
      { key: "about.dilemmas.title", label: "三重困境的標題" },
      { key: "about.dilemma1.who", label: "困境 1：對象" },
      { key: "about.dilemma1.text", label: "困境 1：內容", rows: 2 },
      { key: "about.dilemma2.who", label: "困境 2：對象" },
      { key: "about.dilemma2.text", label: "困境 2：內容", rows: 2 },
      { key: "about.dilemma3.who", label: "困境 3：對象" },
      { key: "about.dilemma3.text", label: "困境 3：內容", rows: 2 },
      { key: "about.closing", label: "結語", rows: 3 },
    ],
  },
];

export function ContentForm({ values }: { values: Record<string, string> }) {
  const [state, action] = useActionState(saveSiteContent, undefined);
  return (
    <form action={action} className="space-y-10">
      {GROUPS.map((g) => (
        <section key={g.title} className="card space-y-5 p-6">
          <h2 className="font-serif text-[20px] font-light">{g.title}</h2>
          {g.fields.map((f) => (
            <label key={f.key} className="block">
              <span className="field-label">{f.label}</span>
              {f.rows ? (
                <textarea name={f.key} defaultValue={values[f.key]} rows={f.rows} className="input" />
              ) : (
                <input name={f.key} defaultValue={values[f.key]} className="input" />
              )}
              {f.hint && <span className="field-hint block">{f.hint}</span>}
            </label>
          ))}
        </section>
      ))}
      <div className="sticky bottom-4 flex items-center gap-4 rounded-full bg-canvas/90 py-2 backdrop-blur">
        <SubmitButton className="btn btn-stone" pending="儲存中…">儲存首頁內容</SubmitButton>
        <FormMessage state={state} />
      </div>
    </form>
  );
}

export function HeroImageForm({ current }: { current: string }) {
  const [state, action] = useActionState(uploadHeroImage, undefined);
  const [removeState, setRemoveState] = useActionState(async () => removeHeroImage(), undefined);
  const [pending, start] = useTransition();
  const ref = useRef<HTMLInputElement>(null);
  return (
    <section className="card p-6">
      <h2 className="font-serif text-[20px] font-light">主視覺圖片</h2>
      <div className="mt-4 aspect-[16/7] overflow-hidden rounded-[20px] bg-surface-grey">
        {current ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={current} alt="目前的主視覺" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center text-[14px] text-ash">目前使用預設的河岸插畫</div>
        )}
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button type="button" onClick={() => ref.current?.click()} disabled={pending} className="btn btn-outline btn-sm">
          {pending ? "上傳中…" : "上傳新圖片"}
        </button>
        {current && (
          <form action={setRemoveState}>
            <SubmitButton className="btn btn-sm text-ash hover:text-error" pending="處理中…">改回預設插畫</SubmitButton>
          </form>
        )}
        <span className="text-[13px] text-ash">建議橫式、寬 2000px 以上，會自動壓縮。</span>
      </div>
      <input
        ref={ref}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={async (e) => {
          const f = e.target.files?.[0];
          if (!f) return;
          const resized = await resizeImage(f, 2400, 0.82);
          const fd = new FormData();
          fd.set("image", resized);
          start(() => action(fd));
        }}
      />
      <div className="mt-3">
        <FormMessage state={state ?? removeState} />
      </div>
    </section>
  );
}
