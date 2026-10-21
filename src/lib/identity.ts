import { COMPASS_GRAD_YEARS, DEGREE_LABEL, type Degree } from "./constants";

export type Education = {
  id: string;
  degree: Degree;
  student_no: string | null;
  entry_year: number | null;
  grad_year: number | null;
};

export type Identity = {
  isStudent: boolean;
  isAlumni: boolean;
  /** 審核通過的老師 */
  isTeacher: boolean;
  teacherPending: boolean;
  /** 可以出現在系友園地、寫故事：系友或審核通過的老師 */
  canBeListed: boolean;
  /** 職涯羅盤：在學中，或畢業 5 年內 */
  canUseCompass: boolean;
};

export function currentYear(now = new Date()) {
  return now.getFullYear();
}

/** 身分不由使用者勾選，而是由學歷紀錄推算 */
export function deriveIdentity(
  education: Pick<Education, "grad_year">[],
  roleTeacher: boolean,
  teacherVerified: boolean,
  now = new Date(),
): Identity {
  const isStudent = !roleTeacher && education.some((e) => e.grad_year == null);
  const gradYears = education.map((e) => e.grad_year).filter((y): y is number => y != null);
  const isAlumni = gradYears.length > 0;
  const isTeacher = roleTeacher && teacherVerified;
  const recentGrad = isAlumni && currentYear(now) - Math.max(...gradYears) <= COMPASS_GRAD_YEARS;
  return {
    isStudent,
    isAlumni,
    isTeacher,
    teacherPending: roleTeacher && !teacherVerified,
    canBeListed: isAlumni || isTeacher,
    canUseCompass: isStudent || recentGrad,
  };
}

export function identityLabels(id: Identity): string[] {
  const out: string[] = [];
  if (id.isTeacher) out.push("老師");
  if (id.isAlumni) out.push("系友");
  if (id.isStudent) out.push("學生");
  return out;
}

const degreeOrder: Record<Degree, number> = { B: 0, M: 1, D: 2 };

export function sortEducation<T extends Pick<Education, "degree" | "entry_year" | "grad_year">>(list: T[]) {
  return [...list].sort(
    (a, b) =>
      degreeOrder[a.degree] - degreeOrder[b.degree] ||
      (a.entry_year ?? a.grad_year ?? 0) - (b.entry_year ?? b.grad_year ?? 0),
  );
}

/** 屆別：最早一筆學歷的畢業年；沒有畢業年時用入學年 */
export function classYearLabel(list: Pick<Education, "degree" | "entry_year" | "grad_year">[]): string | null {
  const first = sortEducation(list)[0];
  if (!first) return null;
  if (first.grad_year) return `${DEGREE_LABEL[first.degree]} ${first.grad_year} 屆`;
  if (first.entry_year) return `${DEGREE_LABEL[first.degree]} ${first.entry_year} 入學`;
  return null;
}

export function educationLine(e: Pick<Education, "degree" | "entry_year" | "grad_year">) {
  const years =
    e.entry_year && e.grad_year
      ? `${e.entry_year}–${e.grad_year}`
      : e.grad_year
        ? `${e.grad_year} 畢業`
        : e.entry_year
          ? `${e.entry_year} 入學${e.grad_year == null ? "・在學中" : ""}`
          : "在學中";
  return `臺大心理系 ${DEGREE_LABEL[e.degree]} · ${years}`;
}

export function initials(name: string) {
  const t = name.trim();
  if (!t) return "?";
  // 中文姓名取名字（後兩字）；英文取前兩個字首
  if (/[一-鿿]/.test(t)) return t.length >= 3 ? t.slice(-2) : t;
  return t
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");
}
