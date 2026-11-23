"use client";

import Link from "next/link";
import {
  CATEGORIES,
  ITEMS,
  levelOf,
  LEVEL_LABEL,
  scoreCddq,
  SERVICES_BY_CATEGORY,
  SUBSCALE_ORDER,
  SUBSCALES,
  type CategoryKey,
} from "@/lib/cddq";
import { CompassProfile } from "@/components/compass/CompassProfile";
import { Arrow } from "@/components/ui";

const CAT_KEYS = Object.keys(CATEGORIES) as CategoryKey[];
const delay = (ms: number) => ({ "--delay": `${ms}ms` }) as React.CSSProperties;

/** 試用版的結果：和正式結果頁同樣的算法與畫面，但不存檔、也沒有系友推薦（那需要登入後的標籤） */
export function TrialResult({ items, onRestart }: { items: Record<string, number>; onRestart: () => void }) {
  const scores = scoreCddq(items);
  const topCat = [...CAT_KEYS].sort((a, b) => scores.categories[b] - scores.categories[a])[0];
  const allLow = CAT_KEYS.every((c) => levelOf(scores.categories[c]) === "low");

  // 依最主要困難所屬的大類推薦服務（去除重複）
  const cats = [...new Set(scores.top.map((k) => SUBSCALES[k].category))];
  const services = [...new Map(cats.flatMap((c) => SERVICES_BY_CATEGORY[c]).map((s) => [s.key, s])).values()]
    .slice(0, 4);

  return (
    <div>
      <h2 className="h-section rise max-w-4xl tracking-[0.1em]" style={delay(0)}>
        {allLow ? "三大類都在穩定的範圍" : `最需要處理的是「${CATEGORIES[topCat].label}」`}
      </h2>
      <p className="prose-airy rise mt-5 max-w-2xl text-ash" style={delay(80)}>
        {allLow ? "下面列出相對較高的面向，可以作為下一步的參考。" : CATEGORIES[topCat].summary}
      </p>
      {!scores.validity.ok && (
        <p className="notice mt-6 max-w-2xl">
          有 {scores.validity.failed.length} 題確認作答品質的題目沒有照指示作答，這份結果可能不太準確。
        </p>
      )}

      <section className="mt-14 border-t border-hairline pt-12" data-reveal>
        <h3 className="h-section tracking-[0.1em]">你的羅盤</h3>
        <p className="mt-2 max-w-2xl text-meta text-ash">十個面向分屬三大類；同一個顏色是同一類，大類的分數就是底下面向的平均。</p>
        <div className="mt-8">
          <CompassProfile scores={scores} highlight={scores.top} />
        </div>
      </section>

      <section className="mt-16 border-t border-hairline pt-12">
        <h3 className="h-section tracking-[0.1em]" data-reveal>{allLow ? "相對較高的面向" : "最主要的困難"}</h3>
        <div className="mt-8 grid gap-5 md:grid-cols-3">
          {scores.top.map((k, i) => (
            <div key={k} className="paper-card flex flex-col p-6 md:p-7" data-reveal style={delay(i * 120)}>
              <h4 className="h-item tracking-[0.1em]">{SUBSCALES[k].label}</h4>
              <p className="mt-1 text-meta text-ash">
                {CATEGORIES[SUBSCALES[k].category].label}，{LEVEL_LABEL[levelOf(scores.subscales[k])]} {scores.subscales[k].toFixed(1)}
              </p>
              <p className="mt-4 text-meta leading-[1.85] tracking-[0.03em] text-ink">{SUBSCALES[k].explain}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-16 border-t border-hairline pt-12">
        <h3 className="h-section tracking-[0.1em]" data-reveal>推薦的服務</h3>
        <div className="mt-8 grid gap-5 md:grid-cols-3">
          {services.map((s, i) => (
            <Link key={s.key} href={s.href} className="paper-card group flex flex-col p-6 transition-colors hover:border-river" data-reveal style={delay(i * 100)}>
              <h4 className="h-item tracking-[0.08em]">{s.title}</h4>
              <p className="mt-2 flex-1 text-meta text-ash">{s.text}</p>
              <span className="link-arrow mt-5">
                前往 <Arrow />
              </span>
            </Link>
          ))}
        </div>
        <p className="mt-6 text-note text-ash">登入後作答，還會整理一份個人化的生涯報告（行動建議、系友的話、臺大資源），推薦 3 位系友，並保存結果、和下次的結果比較。</p>
      </section>

      <details className="mt-16 border-t border-hairline pt-8 text-meta">
        <summary className="cursor-pointer text-ash hover:text-ink">題目與計分對照（給量表審閱者）</summary>
        <p className="mt-4 text-note text-ash">
          每題 1–9 分；各面向取平均，三大類為所屬面向的平均；平均 &gt; 6.33 為明顯卡關、&lt; 3.67 為穩定。
        </p>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[640px] text-left">
            <thead>
              <tr className="border-b border-hairline text-note text-ash">
                <th className="py-2 pr-3 font-medium">原題號</th>
                <th className="py-2 pr-3 font-medium">題目</th>
                <th className="py-2 pr-3 font-medium">面向</th>
                <th className="py-2 text-right font-medium">作答</th>
              </tr>
            </thead>
            <tbody>
              {ITEMS.map((it) => (
                <tr key={it.id} className="border-b border-hairline align-top">
                  <td className="py-2 pr-3 tabular-nums text-ash">{"validity" in it ? "檢核" : it.id.slice(1)}</td>
                  <td className="py-2 pr-3">{it.text}</td>
                  <td className="py-2 pr-3 text-ash">{"validity" in it ? `效度題（應選 ${it.validity}）` : SUBSCALES[it.subscale].label}</td>
                  <td className="py-2 text-right tabular-nums">{items[it.id]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>

      <div className="mt-14 flex flex-wrap gap-3 border-t border-hairline pt-10">
        <button type="button" onClick={onRestart} className="btn btn-primary">重新作答</button>
        <Link href="/compass/cddq" className="btn">
          登入後作答並保存結果 <Arrow />
        </Link>
      </div>
    </div>
  );
}
