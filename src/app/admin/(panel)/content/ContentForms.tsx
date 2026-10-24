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
      { key: "hero.tagline", label: "主標題", hint: "首頁以直排顯示，逗號、句號之後會換到下一行。" },
      { key: "hero.subtitle", label: "副標", rows: 3, hint: "直排、字比較小，排在主標題左邊。換行或逗號之後會換到下一行。" },
    ],
  },
  {
    title: "關於計畫",
    fields: [
      { key: "about.spirit", label: "計畫理念", rows: 8, hint: "空一行會分成新段落。" },
      { key: "about.closing", label: "計畫理念的最後一段", rows: 3 },
      { key: "about.dilemmas.title", label: "三重困境的標題" },
      { key: "about.dilemma1.who", label: "困境 1：對象" },
      { key: "about.dilemma1.text", label: "困境 1：內容", rows: 2 },
      { key: "about.dilemma2.who", label: "困境 2：對象" },
      { key: "about.dilemma2.text", label: "困境 2：內容", rows: 2 },
      { key: "about.dilemma3.who", label: "困境 3：對象" },
      { key: "about.dilemma3.text", label: "困境 3：內容", rows: 2 },
    ],
  },
];

export function ContentForm({ values }: { values: Record<string, string> }) {
  const [state, action] = useActionState(saveSiteContent, undefined);
  return (
    <form action={action} className="space-y-10">
      {GROUPS.map((g) => (
        <section key={g.title} className="card space-y-5 p-6">
          <h2 className="h-section">{g.title}</h2>
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
      <div className="sticky bottom-4 flex items-center gap-4 bg-canvas/90 py-2 backdrop-blur">
        <SubmitButton className="btn btn-primary" pending="儲存中…">儲存首頁內容</SubmitButton>
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
      <h2 className="h-section">主視覺圖片</h2>
      <div className="mt-4 aspect-[16/7] overflow-hidden bg-panel">
        {current ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={current} alt="目前的主視覺" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center text-meta text-ash">目前使用預設的河岸插畫</div>
        )}
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button type="button" onClick={() => ref.current?.click()} disabled={pending} className="btn btn-sm">
          {pending ? "上傳中…" : "上傳新圖片"}
        </button>
        {current && (
          <form action={setRemoveState}>
            <SubmitButton className="btn btn-text btn-danger" pending="處理中…">改回預設插畫</SubmitButton>
          </form>
        )}
        <span className="text-note text-ash">建議橫式、寬 2000px 以上，會自動壓縮。</span>
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
