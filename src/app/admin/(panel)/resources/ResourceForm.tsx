"use client";

import { useActionState } from "react";
import { saveResource } from "../../resource-actions";
import { FormMessage, SubmitButton } from "@/components/forms";
import { SUBSCALE_ORDER, SUBSCALES } from "@/lib/cddq";
import { COMPONENTS } from "@/lib/agent/types";
import { COMPONENT_LABEL } from "@/lib/agent/copy";

type R = {
  id: string;
  title: string;
  provider: string;
  level: string;
  url: string;
  summary: string;
  subscales: string[];
  components: string[];
  evidence: string;
  needs_human: boolean;
};

const LEVELS = [
  ["national", "全國"],
  ["university", "校級"],
  ["college", "院級"],
  ["department", "系級"],
  ["leftbank", "左岸"],
];
const EVIDENCE = [
  ["direct", "【直】整合分析支持"],
  ["inferred", "【推】推論"],
  ["preliminary", "【初】初步證據"],
];

/** 新增或編輯一筆資源。代號相同就是更新。 */
export function ResourceForm({ r }: { r?: R }) {
  const [state, action] = useActionState(saveResource, undefined);
  return (
    <form action={action} className="space-y-5">
      <div className="grid gap-4 md:grid-cols-2">
        <label className="block">
          <span className="field-label">代號（英文小寫、數字、-）</span>
          <input name="id" defaultValue={r?.id} readOnly={Boolean(r)} className="input" required />
        </label>
        <label className="block">
          <span className="field-label">名稱</span>
          <input name="title" defaultValue={r?.title} className="input" required />
        </label>
        <label className="block">
          <span className="field-label">提供單位</span>
          <input name="provider" defaultValue={r?.provider} className="input" required />
        </label>
        <label className="block">
          <span className="field-label">網址</span>
          <input name="url" defaultValue={r?.url} className="input" placeholder="https:// 或 /alumni" required />
        </label>
        <label className="block">
          <span className="field-label">層級</span>
          <select name="level" defaultValue={r?.level ?? "university"} className="input">
            {LEVELS.map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="field-label">證據層級</span>
          <select name="evidence" defaultValue={r?.evidence ?? "inferred"} className="input">
            {EVIDENCE.map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
        </label>
      </div>
      <label className="block">
        <span className="field-label">說明（給 Agent 和學生看的 1–2 句）</span>
        <textarea name="summary" defaultValue={r?.summary} rows={2} className="input" required />
      </label>
      <fieldset>
        <legend className="field-label">對應面向</legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {SUBSCALE_ORDER.map((k) => (
            <label key={k} className="chip">
              <input type="checkbox" name="subscales" value={k} defaultChecked={r?.subscales.includes(k)} className="sr-only" />
              {SUBSCALES[k].label}
            </label>
          ))}
        </div>
      </fieldset>
      <fieldset>
        <legend className="field-label">有效成分</legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {COMPONENTS.map((c) => (
            <label key={c} className="chip">
              <input type="checkbox" name="components" value={c} defaultChecked={r?.components.includes(c)} className="sr-only" />
              {COMPONENT_LABEL[c]}
            </label>
          ))}
        </div>
      </fieldset>
      <label className="flex items-center gap-2 text-meta">
        <input type="checkbox" name="needs_human" defaultChecked={r?.needs_human} />
        有人帶領的服務（諮詢、課程、系友）
      </label>
      <FormMessage state={state} />
      <SubmitButton>{r ? "儲存並標記為今天查證" : "新增資源"}</SubmitButton>
    </form>
  );
}
