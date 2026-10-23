import type { Degree } from "./constants";
import { currentYear } from "./identity";

export type EduInput = {
  degree: Degree;
  student_no: string | null;
  entry_year: number | null;
  grad_year: number | null;
};

export const MIN_YEAR = 1950;

/** 讀取表單裡重複的 edu_* 欄位（註冊頁、我的帳號共用） */
export function parseEducationForm(fd: FormData): { rows: EduInput[] } | { error: string } {
  const degrees = fd.getAll("edu_degree").map(String);
  const nos = fd.getAll("edu_student_no").map((v) => String(v).trim().toUpperCase());
  const entries = fd.getAll("edu_entry").map((v) => String(v).trim());
  const grads = fd.getAll("edu_grad").map((v) => String(v).trim());
  const maxYear = currentYear() + 1;
  const rows: EduInput[] = [];

  for (let i = 0; i < degrees.length; i++) {
    const degree = degrees[i] as Degree;
    if (!["B", "M", "D"].includes(degree)) return { error: "請選擇學位。" };
    const student_no = nos[i] || null;
    if (student_no && !/^[A-Z0-9]{4,12}$/.test(student_no)) return { error: `學號「${student_no}」格式不正確。` };
    const entry_year = entries[i] ? Number(entries[i]) : null;
    const grad_year = grads[i] ? Number(grads[i]) : null;
    for (const y of [entry_year, grad_year]) {
      if (y != null && (!Number.isInteger(y) || y < MIN_YEAR || y > maxYear)) {
        return { error: `年份請填西元年（${MIN_YEAR}–${maxYear}）。` };
      }
    }
    if (entry_year && grad_year && grad_year < entry_year) return { error: "畢業年不能早於入學年。" };
    if (grad_year == null && entry_year == null) return { error: "每筆學歷至少要填入學年；已畢業請填畢業年。" };
    rows.push({ degree, student_no, entry_year, grad_year });
  }
  if (rows.length > 6) return { error: "學歷最多 6 筆。" };
  return { rows };
}

/** 系友可以同時是學生或老師；只有老師和學生互斥 */
export type IdentityFlags = { student: boolean; alumni: boolean; teacher: boolean };

export function validateEducationForIdentity(id: IdentityFlags, edu: EduInput[]): string | null {
  if (!id.student && !id.alumni && !id.teacher) return "請選擇你的身分。";
  if (id.student && id.teacher) return "學生和教師不能同時選擇。";
  if (id.student) {
    if (!edu.some((e) => e.grad_year == null)) return "學生請至少填一筆「在學中」的學歷（畢業年留空）。";
    if (edu.some((e) => e.grad_year == null && !e.student_no)) return "在學中的學歷請填寫學號。";
  }
  if (id.alumni && !edu.some((e) => e.grad_year != null)) {
    return "系友請至少填一筆已畢業的學歷（填上畢業年）。";
  }
  if (id.teacher && edu.some((e) => e.grad_year == null)) {
    return "教師身分不會同時是在學學生；若你也是系友，請填上畢業年。";
  }
  return null;
}
