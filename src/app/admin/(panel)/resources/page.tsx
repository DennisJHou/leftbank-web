import { requireAdmin } from "@/lib/admin-auth";
import { LEVEL_TEXT, listResources } from "@/lib/resources";
import { SUBSCALES, type SubscaleKey } from "@/lib/cddq";
import { EVIDENCE_LABEL } from "@/lib/diagnosis-config";
import { ConfirmButton } from "../../ConfirmButton";
import { markResourceVerified, toggleResource } from "../../resource-actions";
import { PageTitle, Table, Td, Th } from "../../ui";
import { ResourceForm } from "./ResourceForm";

export const dynamic = "force-dynamic";
export const metadata = { title: "資源目錄" };

/** 資源目錄：分流 Agent 只能推薦這裡面「啟用中」的資源 */
export default async function ResourcesPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireAdmin();
  const { edit } = await searchParams;
  const list = await listResources();
  const editing = typeof edit === "string" ? list.find((r) => r.id === edit) : undefined;
  const staleBefore = Date.now() - 60 * 86400_000;

  return (
    <>
      <PageTitle title="資源目錄" lead="生涯報告裡的資源只能從這裡挑。停用的項目不會出現在新的生涯報告；超過 60 天沒查證的會標示出來。" />
      <Table>
        <thead>
          <tr>
            <Th>資源</Th>
            <Th>層級</Th>
            <Th>對應面向</Th>
            <Th>證據</Th>
            <Th>上次查證</Th>
            <Th className="text-right">操作</Th>
          </tr>
        </thead>
        <tbody>
          {list.map((r) => {
            const stale = new Date(r.last_verified).getTime() < staleBefore;
            return (
              <tr key={r.id} className={r.active ? "" : "opacity-50"}>
                <Td>
                  <a href={r.url} target="_blank" rel="noreferrer" className="font-medium underline-offset-4 hover:underline">
                    {r.title}
                  </a>
                  <p className="text-note text-ash">
                    {r.provider}
                    {r.needs_human && "・有人帶領"}
                    {!r.active && "・已停用"}
                  </p>
                </Td>
                <Td>{LEVEL_TEXT[r.level]}</Td>
                <Td className="text-note">{r.subscales.map((s) => SUBSCALES[s as SubscaleKey]?.label ?? s).join("、")}</Td>
                <Td>【{EVIDENCE_LABEL[r.evidence]}】</Td>
                <Td className={stale ? "text-error" : ""}>
                  {r.last_verified}
                  {stale && <span className="block text-note">超過 60 天</span>}
                </Td>
                <Td className="whitespace-nowrap text-right">
                  <div className="flex justify-end gap-2">
                    <a href={`/admin/resources?edit=${r.id}#form`} className="btn btn-sm">編輯</a>
                    <ConfirmButton action={markResourceVerified.bind(null, r.id)}>已查證</ConfirmButton>
                    <ConfirmButton action={toggleResource.bind(null, r.id)} confirm={r.active ? "停用後，新的生涯報告不會再推薦這項資源。確定嗎？" : undefined}>
                      {r.active ? "停用" : "啟用"}
                    </ConfirmButton>
                  </div>
                </Td>
              </tr>
            );
          })}
        </tbody>
      </Table>

      <section id="form" className="card mt-10 p-6">
        <h2 className="h-section mb-6">{editing ? `編輯：${editing.title}` : "新增資源"}</h2>
        <ResourceForm key={editing?.id ?? "new"} r={editing} />
      </section>
    </>
  );
}
