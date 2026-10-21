import Link from "next/link";
import { Suspense } from "react";
import { getCurrentUser } from "@/lib/auth";
import { countDirectory, listDirectory } from "@/lib/queries";
import { InitialsPanel } from "@/components/Avatar";
import { EmptyState, PageHeader } from "@/components/ui";
import { FilterBar } from "./FilterBar";

export const metadata = { title: "系友園地" };

export default async function AlumniPage({ searchParams }: PageProps<"/alumni">) {
  const sp = await searchParams;
  const get = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : "");
  const filter = get("filter");
  const user = await getCurrentUser();
  const [total, people] = await Promise.all([
    countDirectory(),
    listDirectory(
      { q: get("q").slice(0, 50), field: get("field"), question: filter === "question", coffee: filter === "coffee", talk: filter === "talk" },
      Boolean(user),
    ),
  ]);

  return (
    <div className="container-page">
      <PageHeader title="系友園地" />
      {total === 0 ? (
        <EmptyState />
      ) : (
        <>
          <Suspense>
            <FilterBar />
          </Suspense>
          <p className="mt-10 text-meta text-ash">共 {people.length} 位</p>
          {people.length ? (
            <ul className="mt-5 grid grid-cols-2 gap-x-5 gap-y-12 md:grid-cols-3 md:gap-x-8 lg:grid-cols-4">
              {people.map((p) => (
                <li key={p.id}>
                  <Link href={`/alumni/${p.id}`} className="group block">
                    <div className="relative aspect-square overflow-hidden bg-panel">
                      {p.photo ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={p.photo} alt={p.name} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]" />
                      ) : (
                        <InitialsPanel name={p.name} className="transition-transform duration-500 group-hover:scale-[1.03]" />
                      )}
                      {p.isTeacher && <span className="tag absolute left-3 top-3">老師</span>}
                    </div>
                    <p className="h-item mt-4 group-hover:underline group-hover:underline-offset-4">{p.name}</p>
                    <p className="line-clamp-2 text-meta text-ash">{p.title ?? p.fields.join("、")}</p>
                    {p.classYear && <p className="text-meta text-ash">{p.classYear}</p>}
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <div className="mt-5">
              <EmptyState title="沒有符合條件的系友">換個關鍵字或篩選條件試試看。</EmptyState>
            </div>
          )}
        </>
      )}
    </div>
  );
}
