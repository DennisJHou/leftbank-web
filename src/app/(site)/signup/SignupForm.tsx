"use client";

import { useActionState, useState } from "react";
import { signup } from "@/app/actions/auth";
import { FormMessage, SubmitButton } from "@/components/forms";
import { EducationFields, newEduRow, type EduRow } from "@/components/EducationFields";
import { PASSWORD_MIN } from "@/lib/constants";

type Role = "student" | "teacher" | "";

const ROLES: { value: Exclude<Role, "">; label: string; hint: string }[] = [
  { value: "student", label: "學生", hint: "學士、碩士、博士班在學" },
  { value: "teacher", label: "教師", hint: "需管理員審核" },
];

export function SignupForm({ asAlumni = false }: { asAlumni?: boolean }) {
  const [state, action] = useActionState(signup, undefined);
  const [alumni, setAlumni] = useState(asAlumni);
  const [role, setRole] = useState<Role>(asAlumni ? "" : "student");
  const [rows, setRows] = useState<EduRow[]>([asAlumni ? newEduRow() : newEduRow({ studying: true })]);

  const hasStudying = (r: EduRow[]) => r.some((x) => x.studying);
  const hasGraduated = (r: EduRow[]) => r.some((x) => !x.studying);

  // 系友可以同時是學生或老師；學生和老師互斥。切換時補上對應的學歷列，教師則移除在學列
  const toggleAlumni = () => {
    const next = !alumni;
    setAlumni(next);
    if (next && !hasGraduated(rows)) setRows([...rows, newEduRow()]);
  };
  const chooseRole = (v: Exclude<Role, "">) => {
    const next: Role = role === v ? "" : v;
    setRole(next);
    if (next === "student" && !hasStudying(rows)) setRows([...rows, newEduRow({ studying: true })]);
    if (next === "teacher") setRows(rows.filter((x) => !x.studying));
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
        <input type="hidden" name="role" value={role} />
        <input type="hidden" name="is_alumni" value={alumni ? "1" : "0"} />
        <div className="grid grid-cols-3 gap-2">
          <button
            type="button"
            aria-pressed={alumni}
            aria-label="系友（曾在臺大心理系畢業）"
            onClick={toggleAlumni}
            className={`border px-3 py-3 text-left transition-colors ${
              alumni ? "border-ink bg-ink text-white" : "border-line bg-surface text-ink hover:border-ink"
            }`}
          >
            <span className="block text-meta font-medium">系友</span>
            <span className={`mt-0.5 block text-note ${alumni ? "text-white/75" : "text-ash"}`}>曾在臺大心理系畢業</span>
          </button>
          {ROLES.map((it) => (
            <button
              key={it.value}
              type="button"
              aria-pressed={role === it.value}
              aria-label={`${it.label}（${it.hint}）`}
              onClick={() => chooseRole(it.value)}
              className={`border px-3 py-3 text-left transition-colors ${
                role === it.value ? "border-ink bg-ink text-white" : "border-line bg-surface text-ink hover:border-ink"
              }`}
            >
              <span className="block text-meta font-medium">{it.label}</span>
              <span className={`mt-0.5 block text-note ${role === it.value ? "text-white/75" : "text-ash"}`}>
                {it.hint}
              </span>
            </button>
          ))}
        </div>
        <p className="mt-2 text-note text-ash">系友可以同時是學生或教師；只有學生和教師不能同時選。</p>
      </fieldset>

      <div>
        <p className="field-label">臺大心理系的學歷</p>
        <p className="mb-5 text-meta text-ash">
          {role === "student" && "在學中的學歷請填學號。"}
          {role === "teacher" && "教師不需要填學號。"}
          {alumni && " 系友請填已畢業的學歷（填上畢業年）；忘記學號的系友可以留空，只填入學或畢業年，但需要管理員審核。"}
        </p>
        <EducationFields rows={rows} setRows={setRows} allowStudying={role !== "teacher"} />
      </div>

      <FormMessage state={state} />
      <SubmitButton className="btn btn-primary w-full" pending="建立帳號中…">建立帳號</SubmitButton>
      <p className="text-center text-note text-ash">
        註冊即表示你同意左岸計畫依照本網站說明使用你的資料。
      </p>
    </form>
  );
}
