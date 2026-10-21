import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireActiveUser } from "@/lib/auth";
import { activeRequest, getPublicProfile } from "@/lib/queries";
import { CONTACT_TYPE_LABEL, type ContactType } from "@/lib/constants";
import { Avatar } from "@/components/Avatar";
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
    <div className="container-narrow pt-8 md:pt-12">
      <Link href={`/alumni/${id}`} className="text-[14px] text-ash hover:text-stone">← {p.name}</Link>
      <div className="mt-8 flex items-center gap-4">
        <Avatar name={p.name} src={p.photo} size={56} />
        <div>
          <p className="eyebrow">{CONTACT_TYPE_LABEL[type]}</p>
          <h1 className="display mt-2 text-[30px] md:text-[38px]">
            {type === "coffee" ? `約${p.name}喝一杯咖啡` : `寫信給${p.name}`}
          </h1>
        </div>
      </div>
      <p className="mt-6 text-[16px] leading-relaxed text-stone">
        {type === "coffee"
          ? "準備 3 個具體的問題，和系友見面聊聊（實體或線上）。系友的負擔是一次見面，請珍惜他的時間。"
          : "寫下 1–3 個你最想問的問題。系友的負擔是回一封信，問題越具體，越容易得到回覆。"}
      </p>
      <div className="mt-10">
        <ContactForm alumniId={id} type={type} email={user.email} />
      </div>
    </div>
  );
}
