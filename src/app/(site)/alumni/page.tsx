import Link from "next/link";
import { Suspense } from "react";
import { getCurrentUser } from "@/lib/auth";
import { listDirectory } from "@/lib/queries";
import { InitialsPanel } from "@/components/Avatar";
import { FilterBar } from "./FilterBar";

export const metadata = { title: "系友園地" };

export default async function AlumniPage({ searchParams }: PageProps<"/alumni">) {
  const sp = await searchParams;
  const get = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : "");
  const filter = get("filter");
  const user = await getCurrentUser();
  const people = await listDirectory(
    {
      q: get("q").slice(0, 50),
      field: get("field"),
      question: filter === "question",
      coffee: filter === "coffee",
      talk: filter === "talk",
    },
    Boolean(user),
  );

  return (
    <div className="container-page pt-10 md:pt-16">
      <p className="eyebrow">系友園地</p>
      <h1 className="display mt-4 text-[38px] md:text-[60px]">心理系的人，都走到了哪裡</h1>
      <p className="mt-4 max-w-xl text-[17px] text-stone">
        每一位都願意被學弟妹看見。點進去讀讀他們的故事
        {user ? "，或寫封信、約杯咖啡。" : "；登入後可以寫信提問或約一杯咖啡。"}
      </p>

      <div className="mt-10">
        <Suspense>
          <FilterBar />
        </Suspense>
      </div>

      <p className="mt-8 text-[14px] text-ash">{people.length} 位</p>
      {people.length ? (
        <ul className="mt-4 grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-3 md:gap-x-5 lg:grid-cols-4">
          {people.map((p) => (
            <li key={p.id}>
              <Link href={`/alumni/${p.id}`} className="group block">
                <div className="relative aspect-[4/5] overflow-hidden rounded-card bg-surface">
                  {p.photo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.photo} alt={p.name} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]" />
                  ) : (
                    <InitialsPanel name={p.name} className="transition-transform duration-500 group-hover:scale-[1.03]" />
                  )}
                  {p.isTeacher && <span className="chip absolute left-3 top-3 bg-surface/90">老師</span>}
                </div>
                <p className="mt-3 text-[17px] font-medium group-hover:underline">{p.name}</p>
                <p className="mt-0.5 line-clamp-2 text-[14px] text-ash">{p.title ?? p.fields.join("、")}</p>
                {p.classYear && <p className="mt-0.5 text-[13px] text-mute">{p.classYear}</p>}
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <div className="card mt-4 p-10 text-center text-stone">沒有符合條件的系友，換個關鍵字或篩選試試看。</div>
      )}
    </div>
  );
}
