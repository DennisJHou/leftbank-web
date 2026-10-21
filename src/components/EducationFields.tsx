"use client";

import { useState } from "react";
import type { Degree } from "@/lib/constants";

export type EduRow = { key: number; degree: Degree; student_no: string; entry: string; grad: string; studying: boolean };

let seq = 0;
export function newEduRow(partial: Partial<Omit<EduRow, "key">> = {}): EduRow {
  return { key: ++seq, degree: "B", student_no: "", entry: "", grad: "", studying: false, ...partial };
}

/** 學歷紀錄（可以多筆）。欄位名稱 edu_degree / edu_student_no / edu_entry / edu_grad 由伺服器端依序讀取。 */
export function EducationFields({
  rows,
  setRows,
  allowStudying = true,
}: {
  rows: EduRow[];
  setRows: (rows: EduRow[]) => void;
  allowStudying?: boolean;
}) {
  const update = (key: number, patch: Partial<EduRow>) =>
    setRows(rows.map((r) => (r.key === key ? { ...r, ...patch } : r)));

  return (
    <div className="space-y-4">
      {rows.map((r, i) => (
        <fieldset key={r.key} className="rounded-[20px] border border-hairline bg-surface p-4 md:p-5">
          <div className="mb-3 flex items-center justify-between">
            <legend className="text-[13px] font-medium text-ash">學歷 {i + 1}</legend>
            <button
              type="button"
              onClick={() => setRows(rows.filter((x) => x.key !== r.key))}
              className="text-[13px] text-ash hover:text-error"
            >
              移除
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <label className="col-span-1">
              <span className="field-label">學位</span>
              <select
                name="edu_degree"
                value={r.degree}
                onChange={(e) => update(r.key, { degree: e.target.value as Degree })}
                className="input"
              >
                <option value="B">學士</option>
                <option value="M">碩士</option>
                <option value="D">博士</option>
              </select>
            </label>
            <label className="col-span-1">
              <span className="field-label">學號</span>
              <input
                name="edu_student_no"
                value={r.student_no}
                onChange={(e) => update(r.key, { student_no: e.target.value })}
                placeholder="例如 B12207001"
                className="input uppercase placeholder:normal-case"
                autoComplete="off"
              />
            </label>
            <label>
              <span className="field-label">入學年（西元）</span>
              <input
                name="edu_entry"
                inputMode="numeric"
                value={r.entry}
                onChange={(e) => update(r.key, { entry: e.target.value.replace(/\D/g, "").slice(0, 4) })}
                placeholder="2022"
                className="input"
              />
            </label>
            <label>
              <span className="field-label">畢業年（西元）</span>
              <input
                name="edu_grad"
                inputMode="numeric"
                value={r.studying ? "" : r.grad}
                disabled={r.studying}
                onChange={(e) => update(r.key, { grad: e.target.value.replace(/\D/g, "").slice(0, 4) })}
                placeholder={r.studying ? "在學中" : "2026"}
                className="input disabled:bg-canvas"
              />
              {r.studying && <input type="hidden" name="edu_grad" value="" />}
            </label>
          </div>
          {allowStudying && (
            <label className="mt-3 flex items-center gap-2 text-[14px] text-stone">
              <input
                type="checkbox"
                checked={r.studying}
                onChange={(e) => update(r.key, { studying: e.target.checked, grad: "" })}
                className="h-4 w-4 accent-[#4a4741]"
              />
              目前在學中
            </label>
          )}
        </fieldset>
      ))}
      <button type="button" onClick={() => setRows([...rows, newEduRow()])} className="btn btn-outline btn-sm">
        ＋ 新增一筆學歷
      </button>
    </div>
  );
}

export function useEduRows(initial: Partial<Omit<EduRow, "key">>[]) {
  return useState<EduRow[]>(() => initial.map((r) => newEduRow(r)));
}
