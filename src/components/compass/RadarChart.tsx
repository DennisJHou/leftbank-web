"use client";

import { useState } from "react";

export type RadarAxis = { key: string; label: string; value: number; previous?: number | null };

const MIN = 1;
const MAX = 9;
const W = 500;
const H = 440;
const CX = W / 2;
const CY = H / 2;
const R = 136;
const CURRENT = "#9a5f17"; // 已用 dataviz validator 驗證（白底）
const PREVIOUS = "#a8a5a0"; // 對照組：灰色虛線，搭配圖例文字與數字表

const angle = (i: number, n: number) => -Math.PI / 2 + (i * 2 * Math.PI) / n;
const point = (i: number, n: number, v: number, extra = 0) => {
  const r = ((Math.min(MAX, Math.max(MIN, v)) - MIN) / (MAX - MIN)) * R + extra;
  return [CX + r * Math.cos(angle(i, n)), CY + r * Math.sin(angle(i, n))] as const;
};
const poly = (vals: number[]) => vals.map((v, i) => point(i, vals.length, v).join(",")).join(" ");
const fmt = (n: number) => n.toFixed(1);

/** 羅盤：10 個小項的雷達圖。分數越外圈，代表在這個面向越卡關。 */
export function RadarChart({ axes, previousLabel }: { axes: RadarAxis[]; previousLabel?: string }) {
  const [hover, setHover] = useState<number | null>(null);
  const n = axes.length;
  const hasPrev = axes.some((a) => a.previous != null);
  const rings = [3, 5, 7, 9];

  return (
    <figure>
      {hasPrev && (
        <figcaption className="mb-4 flex flex-wrap items-center gap-x-6 gap-y-2 text-[13px] text-stone">
          <span className="inline-flex items-center gap-2">
            <span className="h-[3px] w-5 rounded-full" style={{ background: CURRENT }} /> 這一次
          </span>
          <span className="inline-flex items-center gap-2">
            <svg width="20" height="4" aria-hidden>
              <line x1="0" y1="2" x2="20" y2="2" stroke={PREVIOUS} strokeWidth="2" strokeDasharray="4 3" />
            </svg>
            上一次{previousLabel ? `（${previousLabel}）` : ""}
          </span>
        </figcaption>
      )}
      <div className="relative">
        <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label="十個面向的生涯決策困難程度雷達圖，詳細數字見下方表格">
          {/* 「明顯卡關」區域：最外圈淡淡上色 */}
          <circle cx={CX} cy={CY} r={R} fill="#f3e6cc" opacity="0.55" />
          <circle cx={CX} cy={CY} r={((6.33 - MIN) / (MAX - MIN)) * R} fill="#ffffff" />
          {rings.map((v) => (
            <circle key={v} cx={CX} cy={CY} r={((v - MIN) / (MAX - MIN)) * R} fill="none" stroke="#e1dcd3" strokeWidth="1" />
          ))}
          {axes.map((a, i) => {
            const [x, y] = point(i, n, MAX);
            return <line key={a.key} x1={CX} y1={CY} x2={x} y2={y} stroke="#e1dcd3" strokeWidth="1" />;
          })}
          {hasPrev && (
            <polygon
              points={poly(axes.map((a) => a.previous ?? MIN))}
              fill="none"
              stroke={PREVIOUS}
              strokeWidth="2"
              strokeDasharray="5 4"
              strokeLinejoin="round"
            />
          )}
          <polygon points={poly(axes.map((a) => a.value))} fill={CURRENT} fillOpacity="0.14" stroke={CURRENT} strokeWidth="2" strokeLinejoin="round" />
          {axes.map((a, i) => {
            const [x, y] = point(i, n, a.value);
            return (
              <circle key={a.key} cx={x} cy={y} r={hover === i ? 6 : 4} fill={CURRENT} stroke="#ffffff" strokeWidth="2" />
            );
          })}
          {axes.map((a, i) => {
            const [x, y] = point(i, n, MAX, 22);
            const cos = Math.cos(angle(i, n));
            const anchor = Math.abs(cos) < 0.2 ? "middle" : cos > 0 ? "start" : "end";
            return (
              <text
                key={a.key}
                x={x}
                y={y}
                textAnchor={anchor}
                dominantBaseline="middle"
                className={`text-[17px] ${hover === i ? "fill-ink font-medium" : "fill-[#4a4741]"}`}
              >
                {a.label}
              </text>
            );
          })}
          {/* 滑鼠感應區：每個面向一塊扇形 */}
          {axes.map((a, i) => {
            const a0 = angle(i, n) - Math.PI / n;
            const a1 = angle(i, n) + Math.PI / n;
            const rr = R + 40;
            const d = `M${CX},${CY} L${CX + rr * Math.cos(a0)},${CY + rr * Math.sin(a0)} A${rr},${rr} 0 0 1 ${CX + rr * Math.cos(a1)},${CY + rr * Math.sin(a1)} Z`;
            return (
              <path
                key={a.key}
                d={d}
                fill="transparent"
                onMouseEnter={() => setHover(i)}
                onMouseLeave={() => setHover(null)}
                onClick={() => setHover(hover === i ? null : i)}
              />
            );
          })}
        </svg>
        {hover != null && (
          <Tooltip axis={axes[hover]} pos={point(hover, n, axes[hover].value)} />
        )}
      </div>

      <details className="mt-4 text-[14px]">
        <summary className="cursor-pointer text-stone">看數字</summary>
        <table className="mt-3 w-full text-left">
          <thead>
            <tr className="border-b border-hairline text-[12px] font-bold uppercase tracking-wider text-ash">
              <th className="py-2 font-bold">面向</th>
              <th className="py-2 text-right font-bold">這一次</th>
              {hasPrev && <th className="py-2 text-right font-bold">上一次</th>}
            </tr>
          </thead>
          <tbody>
            {axes.map((a) => (
              <tr key={a.key} className="border-b border-hairline">
                <td className="py-2">{a.label}</td>
                <td className="py-2 text-right tabular-nums">{fmt(a.value)}</td>
                {hasPrev && <td className="py-2 text-right tabular-nums text-ash">{a.previous != null ? fmt(a.previous) : "—"}</td>}
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-2 text-[12px] text-ash">分數 1–9，越高代表在這個面向越卡關。6.33 以上為明顯卡關（外圈底色）。</p>
      </details>
    </figure>
  );
}

function Tooltip({ axis, pos }: { axis: RadarAxis; pos: readonly [number, number] }) {
  const left = `${(pos[0] / W) * 100}%`;
  const top = `${(pos[1] / H) * 100}%`;
  return (
    <div
      className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-[calc(100%+14px)] whitespace-nowrap rounded-[12px] bg-ink-band px-3 py-2 text-[13px] text-white shadow-[var(--shadow-float)]"
      style={{ left, top }}
      role="status"
    >
      <span className="font-medium">{axis.label}</span>
      <span className="ml-2 tabular-nums">{fmt(axis.value)}</span>
      {axis.previous != null && <span className="ml-2 tabular-nums text-mute">上次 {fmt(axis.previous)}</span>}
    </div>
  );
}
