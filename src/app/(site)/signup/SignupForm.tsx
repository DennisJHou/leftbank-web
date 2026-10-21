"use client";

import { useActionState, useState } from "react";
import { signup } from "@/app/actions/auth";
import { FormMessage, SubmitButton } from "@/components/forms";
import { EducationFields, newEduRow, type EduRow } from "@/components/EducationFields";
import { PASSWORD_MIN } from "@/lib/constants";

type Identity = "student" | "alumni" | "teacher";

const IDENTITIES: { value: Identity; label: string; hint: string }[] = [
  { value: "student", label: "學生", hint: "學士、碩士、博士班在學" },
  { value: "alumni", label: "系友", hint: "曾在臺大心理系畢業" },
  { value: "teacher", label: "教師", hint: "需管理員審核" },
];

const DEFAULT_ROWS: Record<Identity, () => EduRow[]> = {
  student: () => [newEduRow({ studying: true })],
  alumni: () => [newEduRow()],
  teacher: () => [],
};

export function SignupForm() {
  const [state, action] = useActionState(signup, undefined);
  const [identity, setIdentity] = useState<Identity>("student");
  const [rows, setRows] = useState<EduRow[]>(DEFAULT_ROWS.student);

  const choose = (v: Identity) => {
    setIdentity(v);
    setRows(DEFAULT_ROWS[v]());
  };

  return (
    <form action={action} className="space-y-6">
      <div>
        <label className="field-label" htmlFor="name">姓名</label>
        <input id="name" name="name" required maxLength={40} autoComplete="name" className="input" />
      </div>
      <div>
        <label className="field-label" htmlFor="email">Email</label>
        <input id="email" name="email" type="email" required autoComplete="email" className="input" />
        <p className="field-hint">我們會寄一封驗證信到這個信箱。</p>
      </div>
      <div>
        <label className="field-label" htmlFor="password">密碼</label>
        <input
          id="password"
          name="password"
          type="password"
          required
          minLength={PASSWORD_MIN}
          autoComplete="new-password"
          className="input"
        />
        <p className="field-hint">至少 {PASSWORD_MIN} 個字元。</p>
      </div>

      <fieldset>
        <legend className="field-label">身分</legend>
        <input type="hidden" name="identity" value={identity} />
        <div className="grid grid-cols-3 gap-2">
          {IDENTITIES.map((it) => (
            <button
              key={it.value}
              type="button"
              aria-pressed={identity === it.value}
              aria-label={`${it.label}（${it.hint}）`}
              onClick={() => choose(it.value)}
              className={`rounded-[16px] border px-3 py-3 text-left transition-colors ${
                identity === it.value ? "border-stone bg-stone text-white" : "border-hairline bg-surface text-ink"
              }`}
            >
              <span className="block text-[15px] font-medium">{it.label}</span>
              <span className={`mt-0.5 block text-[12px] ${identity === it.value ? "text-white/75" : "text-ash"}`}>
                {it.hint}
              </span>
            </button>
          ))}
        </div>
      </fieldset>

      <div>
        <p className="field-label">臺大心理系的學歷</p>
        <p className="mb-4 text-[13px] text-ash">
          {identity === "student" && "在學中的學歷請填學號；如果你同時是學士系友，也可以一起填上。"}
          {identity === "alumni" && "可以填多筆。忘記學號的系友可以留空，只填入學或畢業年，但需要管理員審核。"}
          {identity === "teacher" && "教師不需要填學號。如果你也是臺大心理系的系友，可以加上學歷，審核前先用系友身分使用。"}
        </p>
        <EducationFields rows={rows} setRows={setRows} allowStudying={identity !== "teacher"} />
      </div>

      <FormMessage state={state} />
      <SubmitButton className="btn btn-stone w-full" pending="建立帳號中…">建立帳號</SubmitButton>
      <p className="text-center text-[13px] text-ash">
        註冊即表示你同意左岸計畫依照本網站說明使用你的資料。
      </p>
    </form>
  );
}
