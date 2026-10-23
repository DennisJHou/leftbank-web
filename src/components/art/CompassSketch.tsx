import { Ink, WASH, Wash, blob, circle, r1 } from "./sketch";

const C = 200;
const DIRECTIONS: [string, number][] = [["北", 0], ["東", 90], ["南", 180], ["西", 270]];

function ticks() {
  const parts: string[] = [];
  for (let deg = 0; deg < 360; deg += 15) {
    const a = ((deg - 90) * Math.PI) / 180;
    const inner = deg % 90 === 0 ? 108 : 122;
    parts.push(
      `M${r1(C + Math.cos(a) * inner)} ${r1(C + Math.sin(a) * inner)} L${r1(C + Math.cos(a) * 132)} ${r1(C + Math.sin(a) * 132)}`,
    );
  }
  return parts.join(" ");
}

/** 職涯羅盤：手繪的指南針，指針跟著捲動慢慢轉（.needle 的旋轉寫在 globals.css） */
export function CompassSketch() {
  return (
    <svg viewBox="0 0 400 400" className="w-full overflow-visible" aria-hidden>
      <Wash d={blob(C + 8, C + 6, 150, 150, 9, 0.07, 11)} color={WASH.river} opacity={0.9} />
      <Ink d={blob(C, C, 140, 140, 2, 0.015, 14)} className="ink-bold" />
      <Ink d={blob(C, C, 132, 132, 4, 0.012, 14)} />
      <Ink d={ticks()} />
      <Ink d={`M${C} 92 V308 M92 ${C} H308`} className="ink-faint" />
      <Ink d={blob(C, C, 46, 46, 6, 0.03, 10)} className="ink-faint" />
      {DIRECTIONS.map(([label, deg]) => {
        const a = ((deg - 90) * Math.PI) / 180;
        return (
          <text
            key={label}
            x={r1(C + Math.cos(a) * 168)}
            y={r1(C + Math.sin(a) * 168 + 8)}
            textAnchor="middle"
            className="after-draw fill-ink-strong font-serif text-[22px] font-semibold"
          >
            {label}
          </text>
        );
      })}
      <g className="needle">
        <path d="M200 84 L213 200 H187 Z" className="wash" style={{ fill: WASH.seal }} />
        <Ink d="M200 84 L213 200 L200 316 L187 200 Z M187 200 H213" />
        <Ink d={circle(C, C, 6)} />
      </g>
    </svg>
  );
}
