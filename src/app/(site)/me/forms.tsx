"use client";

import { useActionState, useRef, useState, useTransition } from "react";
import { changePassword, removePhoto, updateEducation, updateName, updatePublicProfile, uploadPhoto } from "@/app/actions/me";
import { FormMessage, SubmitButton } from "@/components/forms";
import { EducationFields, newEduRow, type EduRow } from "@/components/EducationFields";
import { Avatar } from "@/components/Avatar";
import { FIELD_CATEGORIES, PASSWORD_MIN, type Degree } from "@/lib/constants";
import { resizeImage } from "@/lib/resize-image";

export function NameForm({ name }: { name: string }) {
  const [state, action] = useActionState(updateName, undefined);
  return (
    <form action={action} className="space-y-3">
      <label className="field-label" htmlFor="name">姓名</label>
      <div className="flex gap-2">
        <input id="name" name="name" defaultValue={name} required maxLength={40} className="input" />
        <SubmitButton className="btn shrink-0" pending="儲存中…">儲存</SubmitButton>
      </div>
      <FormMessage state={state} />
    </form>
  );
}

export function PasswordForm() {
  const [state, action] = useActionState(changePassword, undefined);
  const ref = useRef<HTMLFormElement>(null);
  return (
    <form
      ref={ref}
      action={async (fd) => {
        await action(fd);
        ref.current?.reset();
      }}
      className="space-y-4"
    >
      <div className="grid gap-4 md:grid-cols-2">
        <label>
          <span className="field-label">目前的密碼</span>
          <input name="current" type="password" required autoComplete="current-password" className="input" />
        </label>
        <label>
          <span className="field-label">新密碼</span>
          <input name="next" type="password" required minLength={PASSWORD_MIN} autoComplete="new-password" className="input" />
        </label>
      </div>
      <FormMessage state={state} />
      <SubmitButton className="btn" pending="更新中…">更新密碼</SubmitButton>
    </form>
  );
}

export function EducationForm({
  initial,
  allowStudying,
}: {
  initial: { degree: Degree; student_no: string | null; entry_year: number | null; grad_year: number | null }[];
  allowStudying: boolean;
}) {
  const [state, action] = useActionState(updateEducation, undefined);
  const [rows, setRows] = useState<EduRow[]>(() =>
    initial.map((e) =>
      newEduRow({
        degree: e.degree,
        student_no: e.student_no ?? "",
        entry: e.entry_year ? String(e.entry_year) : "",
        grad: e.grad_year ? String(e.grad_year) : "",
        studying: e.grad_year == null,
      }),
    ),
  );
  return (
    <form action={action} className="space-y-5">
      <EducationFields rows={rows} setRows={setRows} allowStudying={allowStudying} />
      <FormMessage state={state} />
      <SubmitButton className="btn btn-primary" pending="儲存中…">儲存學歷</SubmitButton>
    </form>
  );
}

export function PhotoForm({ name, photo }: { name: string; photo: string | null }) {
  const [state, action] = useActionState(uploadPhoto, undefined);
  const [removeState, setRemoveState] = useState<{ error?: string; ok?: string }>();
  const [pending, start] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  const pick = async (file: File | undefined) => {
    if (!file) return;
    const resized = await resizeImage(file, 800);
    const fd = new FormData();
    fd.set("photo", resized);
    start(() => action(fd));
  };

  return (
    <div className="flex items-center gap-5">
      <Avatar name={name} src={photo} size={96} />
      <div className="space-y-2">
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => inputRef.current?.click()} disabled={pending} className="btn">
            {pending ? "上傳中…" : photo ? "更換照片" : "上傳照片"}
          </button>
          {photo && (
            <button
              type="button"
              disabled={pending}
              onClick={() => start(async () => setRemoveState(await removePhoto()))}
              className="btn btn-text btn-danger"
            >
              移除
            </button>
          )}
        </div>
        <p className="text-note text-ash">JPG、PNG 或 WebP，會自動縮小。</p>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(e) => pick(e.target.files?.[0])}
        />
        <FormMessage state={state ?? removeState} />
      </div>
    </div>
  );
}

type PublicInitial = {
  title: string;
  company: string;
  fields: string[];
  show: boolean;
  question: boolean;
  coffee: boolean;
  talk: boolean;
  vis: Record<string, string>;
};

function Switch({ name, checked, onChange, disabled, label, hint }: {
  name: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
  label: string;
  hint?: string;
}) {
  return (
    <label className={`flex items-start gap-4 py-5 ${disabled ? "opacity-40" : "cursor-pointer"}`}>
      <input
        type="checkbox"
        name={name}
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        className="checkbox mt-1"
      />
      <span>
        <span className="block text-body font-medium">{label}</span>
        {hint && <span className="mt-1 block text-meta text-ash">{hint}</span>}
      </span>
    </label>
  );
}

const VIS_ROWS = [
  { key: "photo", label: "照片", options: ["public", "hidden"] },
  { key: "title", label: "職稱", options: ["public", "hidden"] },
  { key: "field", label: "領域", options: ["public", "hidden"] },
  { key: "company", label: "公司", options: ["public", "hidden"] },
  { key: "class_year", label: "屆別", options: ["members", "hidden"] },
  { key: "education", label: "學歷", options: ["members", "hidden"] },
] as const;
const VIS_LABEL: Record<string, string> = { public: "公開", members: "僅登入者可見", hidden: "不公開" };

export function PublicProfileForm({ initial }: { initial: PublicInitial }) {
  const [state, action] = useActionState(updatePublicProfile, undefined);
  const [show, setShow] = useState(initial.show);
  const [question, setQuestion] = useState(initial.question);
  const [coffee, setCoffee] = useState(initial.coffee);
  const [talk, setTalk] = useState(initial.talk);
  const [fields, setFields] = useState<string[]>(initial.fields);

  const toggleField = (f: string) =>
    setFields((cur) => (cur.includes(f) ? cur.filter((x) => x !== f) : cur.length >= 3 ? cur : [...cur, f]));

  return (
    <form action={action} className="space-y-12">
      <section>
        <h3 className="h-section">公開層級</h3>
        <div className="mt-5 divide-y divide-hairline border-y border-hairline">
          <Switch name="show_in_directory" checked={show} onChange={setShow} label="出現在系友園地" hint="總開關，下面三項都要先打開它。" />
          <Switch name="accept_question" checked={show && question} onChange={setQuestion} disabled={!show} label="接受線上提問" hint="學生寫信給你，你回一封信。" />
          <Switch name="accept_coffee" checked={show && coffee} onChange={setCoffee} disabled={!show} label="接受 Coffee Chat" hint="見面一次，實體或線上皆可。" />
          <Switch name="willing_to_talk" checked={show && talk} onChange={setTalk} disabled={!show} label="願意回校分享" hint="票數只有你和系上看得到。" />
        </div>
        <p className="mt-3 text-note text-ash">你的 email 不會出現在網站上，每一則邀請都可以婉拒。</p>
      </section>

      <section className="space-y-5">
        <h3 className="h-section">基本資料</h3>
        <div className="grid gap-4 md:grid-cols-2">
          <label>
            <span className="field-label">職稱</span>
            <input name="title" defaultValue={initial.title} maxLength={60} placeholder="例如：UX Researcher" className="input" />
          </label>
          <label>
            <span className="field-label">公司或單位</span>
            <input name="company" defaultValue={initial.company} maxLength={60} className="input" />
          </label>
        </div>
        <fieldset>
          <legend className="field-label">領域（最多 3 個）</legend>
          <div className="flex flex-wrap gap-2">
            {FIELD_CATEGORIES.map((f) => (
              <button key={f} type="button" aria-pressed={fields.includes(f)} onClick={() => toggleField(f)} className="option">
                {f}
              </button>
            ))}
          </div>
          {fields.map((f) => (
            <input key={f} type="hidden" name="field_category" value={f} />
          ))}
        </fieldset>
      </section>

      <section>
        <h3 className="h-section">欄位的公開範圍</h3>
        <p className="mt-2 text-meta text-ash">姓名一律公開。</p>
        <div className="mt-4 divide-y divide-hairline border-y border-hairline">
          {VIS_ROWS.map((r) => (
            <div key={r.key} className="flex items-center justify-between gap-4 py-3">
              <span className="text-meta">{r.label}</span>
              <select name={`vis_${r.key}`} defaultValue={initial.vis[r.key] ?? r.options[0]} className="input max-w-[200px] text-meta">
                {r.options.map((o) => (
                  <option key={o} value={o}>{VIS_LABEL[o]}</option>
                ))}
              </select>
            </div>
          ))}
        </div>
      </section>

      <div className="space-y-4">
        <FormMessage state={state} />
        <SubmitButton className="btn btn-primary" pending="儲存中…">儲存公開設定</SubmitButton>
      </div>
    </form>
  );
}
