import Link from "next/link";
import { requireAdmin } from "@/lib/admin-auth";
import { one, query } from "@/lib/db";
import { semesterOf } from "@/lib/semester";
import { aiAvailability, aiConfig, totalSpent } from "@/lib/ai";
import { PageTitle, Stat, Table, Td, Th } from "../ui";

export const dynamic = "force-dynamic";

type Kpi = { key: string; label: string; question: number; coffee: number; responded: number; accepted: number; completed: number; overdue: number };

export default async function Dashboard({ searchParams }: PageProps<"/admin">) {
  const { denied } = await searchParams;
  await requireAdmin();
  const now = semesterOf(new Date());

  const [users, pending, stories, requests, compass, aiCount] = await Promise.all([
    one<{ total: number; recent: number }>(
      `select count(*)::int as total,
              count(*) filter (where created_at > now() - interval '30 days')::int as recent
         from users where email_verified_at is not null`,
    ),
    one<{ n: number }>(
      "select count(*)::int as n from users where email_verified_at is not null and (status = 'pending' or (role_teacher and not teacher_verified and status <> 'suspended'))",
    ),
    one<{ published: number; hidden: number }>(
      "select count(*) filter (where status = 'published')::int as published, count(*) filter (where status = 'hidden')::int as hidden from stories",
    ),
    query<{ type: string; status: string; created_at: Date }>("select type, status, created_at from contact_requests"),
    one<{ cddq: number; ai: number; users: number }>(
      `select count(*) filter (where kind = 'cddq')::int as cddq, count(*) filter (where kind = 'ai')::int as ai,
              count(distinct user_id)::int as users
         from compass_sessions where status = 'completed'`,
    ),
    one<{ n: number }>("select count(*)::int as n from compass_sessions where kind = 'ai'"),
  ]);

  // 每學期 KPI：提問數、咖啡數、接受率、完成數
  const bySem = new Map<string, Kpi>();
  for (const r of requests) {
    const s = semesterOf(r.created_at);
    const k = bySem.get(s.key) ?? { ...s, question: 0, coffee: 0, responded: 0, accepted: 0, completed: 0, overdue: 0 };
    if (r.type === "question") k.question++;
    else k.coffee++;
    if (r.status !== "pending") k.responded++;
    if (r.status === "accepted" || r.status === "completed") k.accepted++;
    if (r.status === "completed") k.completed++;
    if (r.status === "overdue") k.overdue++;
    bySem.set(s.key, k);
  }
  const kpis = [...bySem.values()].sort((a, b) => b.key.localeCompare(a.key, "en", { numeric: true }));
  const pendingReq = requests.filter((r) => r.status === "pending").length;

  const cfg = aiConfig();
  const [spent, availability] = await Promise.all([totalSpent(), aiAvailability()]);
  const AVAIL = { open: "開放中", coming_soon: "未開放（即將推出）", full: "名額已滿" } as const;
  const fmtDate = (d: Date | null) => (d ? d.toLocaleDateString("zh-TW") : "未設定");

  return (
    <>
      {denied && <p className="notice notice-error mb-6">這個頁面只有超級管理員可以使用。</p>}
      <PageTitle title="儀表板" lead={`目前是 ${now.label}`} />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="註冊數（已驗證）" value={users?.total ?? 0} sub={`近 30 天新增 ${users?.recent ?? 0}`} />
        <Link href="/admin/accounts?tab=pending" className="block">
          <Stat label="待審核" value={pending?.n ?? 0} sub="教師、沒有學號的系友" />
        </Link>
        <Stat label="已發布故事" value={stories?.published ?? 0} sub={stories?.hidden ? `下架中 ${stories.hidden}` : undefined} />
        <Link href="/admin/requests?status=pending" className="block">
          <Stat label="待系友回應" value={pendingReq} sub="提問與咖啡邀請" />
        </Link>
      </div>

      <h2 className="mb-4 mt-12 font-serif text-[22px] font-light">提問與咖啡 KPI</h2>
      {kpis.length ? (
        <Table>
          <thead>
            <tr>
              <Th>學期</Th>
              <Th className="text-right">提問數</Th>
              <Th className="text-right">咖啡數</Th>
              <Th className="text-right">接受率</Th>
              <Th className="text-right">完成數</Th>
              <Th className="text-right">逾期</Th>
            </tr>
          </thead>
          <tbody>
            {kpis.map((k) => (
              <tr key={k.key}>
                <Td>{k.label}</Td>
                <Td className="text-right tabular-nums">{k.question}</Td>
                <Td className="text-right tabular-nums">{k.coffee}</Td>
                <Td className="text-right tabular-nums">{k.responded ? `${Math.round((k.accepted / k.responded) * 100)}%` : "—"}</Td>
                <Td className="text-right tabular-nums">{k.completed}</Td>
                <Td className="text-right tabular-nums">{k.overdue}</Td>
              </tr>
            ))}
          </tbody>
        </Table>
      ) : (
        <p className="text-[14px] text-ash">還沒有任何提問或咖啡邀請。</p>
      )}
      <p className="mt-2 text-[12px] text-ash">接受率＝已接受（含已完成）÷ 已有結果的申請（不含待回應）。</p>

      <h2 className="mb-4 mt-12 font-serif text-[22px] font-light">職涯羅盤與 AI</h2>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="量表完成次數" value={compass?.cddq ?? 0} sub={`使用人數 ${compass?.users ?? 0}`} />
        <Stat label="AI 對談" value={aiCount?.n ?? 0} sub={`完成報告 ${compass?.ai ?? 0}`} />
        <Stat label="AI 已用金額" value={`$${spent.toFixed(2)}`} sub={`總預算 $${cfg.budgetUsd.toFixed(2)}`} />
        <Stat
          label="剩餘預算"
          value={`$${Math.max(0, cfg.budgetUsd - spent).toFixed(2)}`}
          sub={`${AVAIL[availability]}`}
        />
      </div>
      <p className="mt-3 text-[13px] text-ash">
        宣傳期：{fmtDate(cfg.promoStart)} – {fmtDate(cfg.promoEnd)} · 每次最多 {cfg.maxTurns} 輪 · 模型 {cfg.model}
        {cfg.mock && " · 開發模式（示範回覆）"}
      </p>
    </>
  );
}
