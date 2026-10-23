import { notFound, redirect } from "next/navigation";
import { requireActiveUser } from "@/lib/auth";
import { activeRequest, getPublicProfile } from "@/lib/queries";
import type { ContactType } from "@/lib/constants";
import { BackLink, PageHeader } from "@/components/ui";
import { ContactForm } from "./ContactForm";

export const metadata = { title: "聯絡系友" };

export default async function ContactPage({ params, searchParams }: PageProps<"/alumni/[id]/contact">) {
  const { id } = await params;
  const { type: rawType } = await searchParams;
  const type: ContactType = rawType === "coffee" ? "coffee" : "question";
  const user = await requireActiveUser(`/alumni/${id}/contact?type=${type}`);
  const p = await getPublicProfile(id, true);
  if (!p) notFound();
  if (user.id === id) redirect(`/alumni/${id}`);
  if (type === "question" ? !p.acceptQuestion : !p.acceptCoffee) redirect(`/alumni/${id}`);
  if (await activeRequest(user.id, id)) redirect(`/alumni/${id}`);

  return (
    <div className="paper-grid paper-page">
      <div className="container-narrow pt-10">
        <BackLink href={`/alumni/${id}`}>{p.name}</BackLink>
        <PageHeader
          eyebrow={type === "coffee" ? "#Coffee Chat" : "#線上提問"}
          title={type === "coffee" ? `約${p.name}喝一杯咖啡` : `寫信給${p.name}`}
        >
          {type === "coffee" ? "準備 3 個具體的問題，實體或線上見面一次。" : "寫下 1 到 3 個問題，系友會以一封信回覆。"}
        </PageHeader>
        <div className="paper-card p-6 md:p-10">
          <ContactForm alumniId={id} type={type} email={user.email} />
        </div>
      </div>
    </div>
  );
}
