import { REFERENCE_GROUPS, REFERENCES, type Reference } from "@/lib/references";

/** 一筆 APA 7 參考文獻 */
function Apa({ r }: { r: Reference }) {
  const doi = r.doi ? `https://doi.org/${r.doi}` : null;
  const end = (
    <>
      {doi && (
        <>
          {" "}
          <a href={doi} target="_blank" rel="noreferrer" className="break-all underline underline-offset-2 hover:text-river">
            {doi}
          </a>
        </>
      )}
    </>
  );
  // 中文文獻用中文 APA 的全形標點：作者（年）。篇名。期刊，卷(期)，頁碼。
  if (/[\u4e00-\u9fff]/.test(r.authors)) {
    return (
      <>
        {r.authors}（{r.year}）。{r.title}。<i>{r.source}</i>，<i>{r.volume}</i>
        {r.issue && `(${r.issue})`}
        {r.pages && `，${r.pages}`}。{end}
      </>
    );
  }
  if (r.inBook) {
    return (
      <>
        {r.authors} ({r.year}). {r.title}. In {r.inBook} <i>{r.source}</i> ({[r.note, r.pages && `pp. ${r.pages}`].filter(Boolean).join(", ")}). {r.publisher}.{end}
      </>
    );
  }
  return (
    <>
      {r.authors} ({r.year}). {r.title}
      {/[?？]$/.test(r.title) ? "" : "."} <i>{r.source}</i>
      {r.volume && (
        <>
          , <i>{r.volume}</i>
        </>
      )}
      {r.issue && (r.volume ? `(${r.issue})` : `, (${r.issue})`)}
      {r.pages && `, ${r.pages}`}.{r.note && ` ${r.note}.`}
      {end}
    </>
  );
}

/** 參考文獻清單（依主題分組，各組依作者排序） */
export function References() {
  return (
    <div className="space-y-6">
      {(Object.keys(REFERENCE_GROUPS) as Reference["group"][]).map((g) => (
        <section key={g}>
          <h4 className="text-meta font-medium text-ink">{REFERENCE_GROUPS[g]}</h4>
          <ul className="mt-2 space-y-2">
            {REFERENCES.filter((r) => r.group === g).map((r) => (
              <li key={r.doi ?? r.title} className="pl-6 -indent-6 text-note leading-[1.7] text-ash">
                <Apa r={r} />
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
