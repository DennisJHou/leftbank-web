import { notFound } from "next/navigation";
import { query } from "@/lib/db";

export const metadata = { title: "開發用信箱", robots: { index: false } };
export const dynamic = "force-dynamic";

/** 本機開發用：沒有設定 SMTP 時，網站寄出的信都記錄在這裡 */
export default async function DevMailbox({ searchParams }: PageProps<"/dev/mailbox">) {
  if (process.env.NODE_ENV === "production") notFound();
  const { id } = await searchParams;
  const mails = await query<{ id: string; to_email: string; reply_to: string | null; subject: string; kind: string; status: string; created_at: Date; html: string }>(
    "select id, to_email, reply_to, subject, kind, status, created_at, html from email_log order by created_at desc limit 50",
  );
  const current = mails.find((m) => m.id === id) ?? mails[0];

  return (
    <div className="container-page pt-10">
      <h1 className="h-page">寄出的信（開發模式）</h1>
      <p className="mt-2 text-meta text-ash">沒有設定 GMAIL_APP_PASSWORD 時，信件不會真的寄出，只記錄在這裡。正式環境不會顯示這個頁面。</p>
      {mails.length === 0 ? (
        <p className="card mt-8 p-8 text-center text-ash">還沒有任何信件。</p>
      ) : (
        <div className="mt-8 grid gap-5 lg:grid-cols-[340px_1fr]">
          <ul className="card max-h-[75vh] divide-y divide-hairline overflow-y-auto">
            {mails.map((m) => (
              <li key={m.id}>
                <a href={`/dev/mailbox?id=${m.id}`} className={`block px-4 py-3 ${m.id === current?.id ? "bg-canvas" : "hover:bg-canvas/60"}`}>
                  <p className="truncate text-meta font-medium">{m.subject}</p>
                  <p className="truncate text-note text-ash">
                    → {m.to_email} · {m.kind} · {new Date(m.created_at).toLocaleString("zh-TW")}
                  </p>
                </a>
              </li>
            ))}
          </ul>
          {current && (
            <div className="card overflow-hidden">
              <div className="border-b border-hairline px-5 py-3 text-note text-stone">
                <p>收件人：{current.to_email}</p>
                {current.reply_to && <p>回覆對象：{current.reply_to}</p>}
                <p>狀態：{current.status}</p>
              </div>
              <iframe title="信件內容" srcDoc={current.html.replace("<body", '<base target="_top"><body')} className="h-[70vh] w-full bg-canvas" />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
