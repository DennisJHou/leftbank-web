/**
 * 分流 Agent 的共用契約（前後端共用，不依賴 server-only）
 * 對應 CDDQ-Agent改造計畫書 §2.3
 */
import { z } from "zod";
import { SUBSCALE_ORDER, type SubscaleKey } from "../cddq";

export const SubscaleEnum = z.enum(SUBSCALE_ORDER as [SubscaleKey, ...SubscaleKey[]]);

export const ROUTES = ["clarify_first", "counseling", "guided", "self_help"] as const;
export type Route = (typeof ROUTES)[number];

export const COMPONENTS = [
  "individualized_feedback",
  "world_of_work_info",
  "writing_exercise",
  "modeling",
  "support_network",
  "counselor_support",
  "values_clarification",
  "decision_psychoeducation",
] as const;
export type Component = (typeof COMPONENTS)[number];
export const ComponentEnum = z.enum(COMPONENTS);

export type Diagnosis = {
  version: string;
  thresholds: { high: number; low: number; flatSd: number; salientSd: number; fastMsPerItem: number; straightShare: number; itemSd: number };
  credibility: { ok: boolean; reasons: ("too_fast" | "straight_line")[] };
  differentiation: "differentiated" | "flat_high" | "flat_low";
  salient: SubscaleKey[];
  confidence: "high" | "medium" | "low";
  route: Route;
  /** 輔助資訊：個人平均與標準差，方便後台稽核 */
  stats: { mean: number; sd: number; itemSd: number };
};

export type Timing = { started_at?: string; submitted_at: string; per_item_ms?: Record<string, number> };

export const STORY_QUESTION_KEYS = ["q1", "q2", "q3", "q4", "q5", "q6", "q7", "q8", "q9", "free"] as const;

export const AgentPlanSchema = z.object({
  overview: z.string().min(10).max(400),
  focuses: z
    .array(
      z.object({
        subscale: SubscaleEnum,
        title: z.string().min(2).max(20),
        why: z.string().min(20).max(300),
        alumni_quote: z
          .object({
            alumni_id: z.string(),
            question: z.enum(STORY_QUESTION_KEYS),
            quote: z.string().min(8).max(160),
          })
          .nullable()
          .optional(),
        resource_ids: z.array(z.string()).min(1).max(2),
        /** 用網路搜尋找到的資訊（校內外官方網站），網址必須出現在搜尋結果裡 */
        links: z
          .array(z.object({ title: z.string().min(2).max(60), url: z.string().url(), note: z.string().min(4).max(120) }))
          .max(3)
          .default([]),
        action: z.string().min(6).max(200),
        writing_prompt: z.string().min(6).max(240),
        components: z.array(ComponentEnum).min(1),
      }),
    )
    .min(1)
    .max(3),
  tags: z.array(z.object({ tag: z.string(), weight: z.number().min(0).max(1) })).max(12),
});
export type AgentPlan = z.infer<typeof AgentPlanSchema>;

export type RunStatus = "queued" | "running" | "succeeded" | "failed" | "fallback" | "skipped";
export type StepKey = "profile" | "stories" | "resources" | "plan";
export type Step = { key: StepKey; status: "pending" | "active" | "done"; at?: string };

/** 給前端呈現用：伺服器把 resource id、系友 id 展開成可以顯示的資料 */
export type ResolvedResource = { id: string; title: string; provider: string; url: string; summary: string; evidence: string };
export type ResolvedLink = { title: string; url: string; note: string; campus: boolean };
export type PlanAlumni = { id: string; name: string; title: string | null; tagline: string | null; accept_question: boolean; accept_coffee: boolean };
export type ResolvedPlan = {
  overview: string;
  focuses: (Omit<AgentPlan["focuses"][number], "alumni_quote" | "resource_ids" | "links"> & {
    quote: { alumniId: string; name: string; title: string | null; text: string } | null;
    resources: ResolvedResource[];
    links: ResolvedLink[];
    changed?: boolean;
  })[];
};

export type AgentStatusPayload = {
  status: RunStatus | "none";
  steps: Step[];
  plan: ResolvedPlan | null;
  canRetry: boolean;
};
