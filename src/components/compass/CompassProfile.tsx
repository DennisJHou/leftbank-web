"use client";

import { useState } from "react";
import { CATEGORIES, levelOf, LEVEL_LABEL, SUBSCALE_ORDER, SUBSCALES, type CategoryKey, type CddqScores, type SubscaleKey } from "@/lib/cddq";

/**
 * 羅盤：十個面向與三大類是同一份資料的兩個層次（三大類 = 所屬小項的平均）。
 * 所以畫成一張圖：雷達的十個軸依大類分成三個扇區（同色），右邊的清單以大類為標題、小項列在底下。
 */

const MIN = 1;
const MAX = 9;
const W = 620;
const H = 460;
const CX = W / 2;
const CY = H / 2;
const R = 140;
const CURRENT = "#9a5f17";
const PREVIOUS = "#a8a5a0";

export const CATEGORY_COLOR: Record<CategoryKey, { mark: string; wash: string }> = {
  readiness: { mark: "#bc924c", wash: "#f0d9a5" },
  information: { mark: "#6f8a5c", wash: "#cfd9bf" },
  inconsistent: { mark: "#b0705c", wash: "#ebcabd" },
};

const CAT_KEYS = Object.keys(CATEGORIES) as CategoryKey[];
const N = SUBSCALE_ORDER.length;
/** 座標四捨五入到小數兩位：伺服器與瀏覽器的三角函數末位可能不同，避免 hydration 不一致 */
const f = (n: number) => Math.round(n * 100) / 100;
const angle = (i: number) => -Math.PI / 2 + (i * 2 * Math.PI) / N;
const radius = (v: number) => ((Math.min(MAX, Math.max(MIN, v)) - MIN) / (MAX - MIN)) * R;
const point = (i: number, v: number, extra = 0) => {
  const r = radius(v) + extra;
  return [f(CX + r * Math.cos(angle(i))), f(CY + r * Math.sin(angle(i)))] as const;
};
const poly = (vals: number[]) => vals.map((v, i) => point(i, v).join(",")).join(" ");
const pct = (v: number) => ((Math.min(MAX, Math.max(MIN, v)) - MIN) / (MAX - MIN)) * 100;

function arcPath(a0: number, a1: number, r0: number, r1: number) {
  const p = (a: number, r: number) => `${f(CX + r * Math.cos(a))},${f(CY + r * Math.sin(a))}`;
  const large = a1 - a0 > Math.PI ? 1 : 0;
  return `M${p(a0, r1)} A${r1},${r1} 0 ${large} 1 ${p(a1, r1)} L${p(a1, r0)} A${r0},${r0} 0 ${large} 0 ${p(a0, r0)} Z`;
}

export function CompassProfile({
  scores,
  previous,
  previousLabel,
  highlight = [],
}: {
  scores: CddqScores;
  previous?: CddqScores | null;
  previousLabel?: string;
  /** 突出項：在圖與清單上加標記 */
  highlight?: SubscaleKey[];
}) {
  const [hover, setHover] = useState<SubscaleKey | null>(null);
  const groups = CAT_KEYS.map((c) => {
    const idx = SUBSCALE_ORDER.map((k, i) => (SUBSCALES[k].category === c ? i : -1)).filter((i) => i >= 0);
    return { c, from: Math.min(...idx), to: Math.max(...idx), keys: SUBSCALE_ORDER.filter((k) => SUBSCALES[k].category === c) };
  });

  return (
    <div className="grid items-start gap-10 lg:grid-cols-[1.05fr_1fr] lg:gap-14">
      <figure className="paper-card p-3 md:p-5">
        <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label="十個面向依三大類分組的雷達圖，數字見旁邊的清單">
          {/* 外圈色帶：標示每個面向屬於哪一大類 */}
          {groups.map((g) => {
            const a0 = angle(g.from) - Math.PI / N;
            const a1 = angle(g.to) + Math.PI / N;
            return <path key={g.c} d={arcPath(a0 + 0.012, a1 - 0.012, R + 4, R + 10)} fill={CATEGORY_COLOR[g.c].mark} />;
          })}
          {[3, 5, 7, 9].map((v) => (
            <circle key={v} cx={CX} cy={CY} r={radius(v)} fill="none" stroke="#e1dcd3" strokeWidth="1" />
          ))}
          {SUBSCALE_ORDER.map((k, i) => {
            const [x, y] = point(i, MAX);
            return <line key={k} x1={CX} y1={CY} x2={x} y2={y} stroke="#e1dcd3" strokeWidth="1" />;
          })}
          {previous && (
            <polygon
              points={poly(SUBSCALE_ORDER.map((k) => previous.subscales[k]))}
              fill="none"
              stroke={PREVIOUS}
              strokeWidth="2"
              strokeDasharray="5 4"
              strokeLinejoin="round"
            />
          )}
          <polygon points={poly(SUBSCALE_ORDER.map((k) => scores.subscales[k]))} fill={CURRENT} fillOpacity="0.16" stroke={CURRENT} strokeWidth="2" strokeLinejoin="round" />
          {SUBSCALE_ORDER.map((k, i) => {
            const [x, y] = point(i, scores.subscales[k]);
            const on = hover === k || highlight.includes(k);
            return <circle key={k} cx={x} cy={y} r={on ? 6 : 4} fill={CURRENT} stroke="#ffffff" strokeWidth="2" />;
          })}
          {SUBSCALE_ORDER.map((k, i) => {
            const [x, y] = point(i, MAX, 30);
            const cos = Math.cos(angle(i));
            const anchor = Math.abs(cos) < 0.2 ? "middle" : cos > 0 ? "start" : "end";
            return (
              <text
                key={k}
                x={x}
                y={y}
                textAnchor={anchor}
                dominantBaseline="middle"
                fontSize={18}
                className={hover === k || highlight.includes(k) ? "fill-ink-strong font-medium" : "fill-ink"}
              >
                {SUBSCALES[k].label}
              </text>
            );
          })}
          {SUBSCALE_ORDER.map((k, i) => {
            const a0 = angle(i) - Math.PI / N;
            const a1 = angle(i) + Math.PI / N;
            const rr = R + 46;
            const d = `M${CX},${CY} L${f(CX + rr * Math.cos(a0))},${f(CY + rr * Math.sin(a0))} A${rr},${rr} 0 0 1 ${f(CX + rr * Math.cos(a1))},${f(CY + rr * Math.sin(a1))} Z`;
            return (
              <path
                key={k}
                d={d}
                fill="transparent"
                onMouseEnter={() => setHover(k)}
                onMouseLeave={() => setHover(null)}
                onClick={() => setHover(hover === k ? null : k)}
              />
            );
          })}
        </svg>
        <figcaption className="mt-2 flex flex-wrap gap-x-5 gap-y-1.5 px-2 text-note text-ash">
          <span className="inline-flex items-center gap-2">
            <span className="h-[3px] w-5" style={{ background: CURRENT }} /> {previous ? "本次測驗" : "你的分數"}
          </span>
          {previous && (
            <span className="inline-flex items-center gap-2">
              <svg width="20" height="4" aria-hidden>
                <line x1="0" y1="2" x2="20" y2="2" stroke={PREVIOUS} strokeWidth="2" strokeDasharray="4 3" />
              </svg>
              上次測驗{previousLabel ? `（${previousLabel}）` : ""}
            </span>
          )}
        </figcaption>
      </figure>

      <div className="space-y-8">
        {groups.map((g) => {
          const v = scores.categories[g.c];
          const pv = previous?.categories[g.c];
          const delta = pv != null ? v - pv : null;
          return (
            <section key={g.c} aria-label={CATEGORIES[g.c].label}>
              <div className="flex items-baseline justify-between gap-4 border-b border-hairline pb-2">
                <h3 className="h-item inline-flex items-center gap-2.5 tracking-[0.08em]">
                  <span className="inline-block h-3 w-3 rounded-full" style={{ background: CATEGORY_COLOR[g.c].mark }} aria-hidden />
                  {CATEGORIES[g.c].label}
                </h3>
                <span className="text-meta text-ash">
                  {LEVEL_LABEL[levelOf(v)]} <span className="tabular-nums">{v.toFixed(1)}</span>
                  {delta != null && Math.abs(delta) >= 0.05 && (
                    <span className="ml-1 tabular-nums">（{delta < 0 ? "降" : "升"} {Math.abs(delta).toFixed(1)}）</span>
                  )}
                </span>
              </div>
              <ul className="mt-3 space-y-2.5">
                {g.keys.map((k) => {
                  const s = scores.subscales[k];
                  const p = previous?.subscales[k];
                  const on = highlight.includes(k);
                  return (
                    <li
                      key={k}
                      className={`grid grid-cols-[7.5rem_1fr_2.5rem] items-center gap-3 text-meta ${hover === k ? "text-ink-strong" : ""}`}
                      onMouseEnter={() => setHover(k)}
                      onMouseLeave={() => setHover(null)}
                    >
                      <span className={`truncate ${on ? "font-medium text-ink-strong" : "text-ink"}`}>
                        {SUBSCALES[k].label}
                        {on && <span className="sr-only">（突出）</span>}
                      </span>
                      <span className="relative h-2 bg-chart-track">
                        <span className="absolute inset-y-0 left-0" style={{ width: `${Math.max(3, pct(s))}%`, background: CATEGORY_COLOR[g.c].mark }} />
                        {p != null && <span className="absolute -top-1 h-4 w-[2px] bg-ink" style={{ left: `calc(${pct(p)}% - 1px)` }} title={`上次測驗 ${p.toFixed(1)}`} />}
                      </span>
                      <span className="text-right tabular-nums text-ash">{s.toFixed(1)}</span>
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
        {previous && (
          <p className="inline-flex items-center gap-2 text-note text-ash">
            <span className="inline-block h-4 w-[2px] bg-ink" aria-hidden />：上次測驗的分數
          </p>
        )}
      </div>
    </div>
  );
}
