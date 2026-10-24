import Link from "next/link";
import { Suspense } from "react";
import { getCurrentUser } from "@/lib/auth";
import { countDirectory, listDirectory } from "@/lib/queries";
import { NameCard } from "@/components/NameCard";
import { ScrollFx } from "@/components/ScrollFx";
import { CoffeeSketch } from "@/components/art/CoffeeSketch";
import { EmptyState, PageHeader } from "@/components/ui";
import { FilterBar } from "./FilterBar";

export const metadata = { title: "系友園地" };

export default async function AlumniPage({ searchParams }: PageProps<"/alumni">) {
  const sp = await searchParams;
  const get = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : "");
  const filter = get("filter");
  const loggedIn = getCurrentUser().then(Boolean);
  const [total, people] = await Promise.all([
    countDirectory(),
    listDirectory(
      { q: get("q").slice(0, 50), field: get("field"), question: filter === "question", coffee: filter === "coffee", talk: filter === "talk" },
      loggedIn,
    ),
  ]);

  return (
    <div className="paper-grid paper-page">
      <ScrollFx />
      <div className="container-page">
        <PageHeader eyebrow="#認識系友" title="系友園地" visual={<CoffeeSketch />}>
          看看學長姐從心理系出發後走過的路。有想問的事，可以線上提問，或約一杯咖啡。
        </PageHeader>
        {total === 0 ? (
          <EmptyState />
        ) : (
          <>
            <Suspense>
              <FilterBar />
            </Suspense>
            <p className="eyebrow mt-12 text-ash">共 {people.length} 位</p>
            {people.length ? (
              <ul className="mt-6 grid grid-cols-2 gap-x-5 gap-y-12 md:grid-cols-3 md:gap-x-8 md:gap-y-14 lg:grid-cols-4">
                {people.map((p, i) => (
                  <li key={p.id} data-reveal style={{ "--delay": `${(i % 4) * 90}ms` } as React.CSSProperties}>
                    <Link href={`/alumni/${p.id}`} className="group block">
                      <div className="relative aspect-square overflow-hidden ring-1 ring-hairline">
                        <div className="h-full w-full transition-transform duration-700 ease-out group-hover:scale-[1.04]">
                          {p.photo ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={p.photo} alt={p.name} className="h-full w-full object-cover" />
                          ) : (
                            <NameCard name={p.name} className="text-[1.5rem] md:text-[2rem]" />
                          )}
                        </div>
                        {p.isTeacher && <span className="seal absolute right-3 top-3 text-[0.75rem]">老師</span>}
                      </div>
                      <p className="h-item mt-4 tracking-[0.12em] transition-colors group-hover:text-river">{p.name}</p>
                      <p className="line-clamp-2 text-meta tracking-[0.03em] text-ash">{p.title ?? p.fields.join("、")}</p>
                      {p.classYear && <p className="text-note text-ash">{p.classYear}</p>}
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="mt-6">
                <EmptyState title="沒有符合條件的系友">換個關鍵字或篩選條件試試看。</EmptyState>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
