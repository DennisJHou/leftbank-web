import { requireAdmin } from "@/lib/admin-auth";
import { query } from "@/lib/db";
import { PageTitle, Table, Td, Th } from "../../ui";

export const metadata = { title: "演講意願" };

export default async function TalksAdmin() {
  await requireAdmin();
  const rows = await query<{
    id: string;
    name: string;
    email: string;
    title: string | null;
    company: string | null;
    willing_to_talk: boolean;
    votes: number;
    recent: number;
  }>(
    `select u.id, u.name, u.email, p.title, p.company, p.willing_to_talk,
            count(v.user_id)::int as votes,
            count(v.user_id) filter (where v.created_at > now() - interval '90 days')::int as recent
       from alumni_profiles p
       join users u on u.id = p.user_id
       left join talk_votes v on v.alumni_id = u.id
      where p.willing_to_talk or exists (select 1 from talk_votes t where t.alumni_id = u.id)
      group by u.id, p.user_id
      order by votes desc, u.name`,
  );

  return (
    <>
      <PageTitle title="演講意願" lead="願意回校分享的系友，依「想聽他回來分享 +1」的票數排序。公開頁面不顯示票數。人文沙龍的報名與押金由系上另外處理。" />
      {rows.length === 0 ? (
        <p className="card p-8 text-center text-meta text-ash">目前沒有系友開放回校分享。</p>
      ) : (
        <Table>
          <thead>
            <tr>
              <Th>#</Th>
              <Th>系友</Th>
              <Th>職稱</Th>
              <Th className="text-right">票數</Th>
              <Th className="text-right">近 90 天</Th>
              <Th>聯絡</Th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.id}>
                <Td className="tabular-nums text-ash">{i + 1}</Td>
                <Td>
                  <a href={`/alumni/${r.id}`} target="_blank" className="font-medium hover:underline">{r.name}</a>
                  {!r.willing_to_talk && <span className="tag ml-2">已關閉意願</span>}
                </Td>
                <Td className="text-note text-stone">{[r.title, r.company].filter(Boolean).join(" · ") || "—"}</Td>
                <Td className="text-right text-body font-medium tabular-nums">{r.votes}</Td>
                <Td className="text-right tabular-nums text-ash">{r.recent}</Td>
                <Td className="text-note">
                  <a href={`mailto:${r.email}`} className="link">{r.email}</a>
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </>
  );
}
