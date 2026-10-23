import { Ink, WASH, Wash, blob } from "./sketch";

const R = 112;
// 每個圓的位置、顏色、動畫起點（從外面滑進來）與標籤位置（放在只屬於自己的那一塊）
const PARTS = [
  { cx: 178, cy: 168, color: WASH.sage, from: [-44, -30], label: [118, 158] },
  { cx: 302, cy: 168, color: WASH.ochre, from: [44, -30], label: [362, 158] },
  { cx: 240, cy: 276, color: WASH.clay, from: [0, 48], label: [240, 350] },
];

/** 三重困境：系友、學生、學術三個水彩圓交疊，交集蓋上「左岸」的印章 */
export function Venn({ labels }: { labels: string[] }) {
  return (
    <svg
      viewBox="0 0 480 440"
      className="mx-auto w-full max-w-[460px] overflow-visible"
      role="img"
      aria-label={`${labels.join("、")}三個圓交疊，交集是左岸計畫`}
    >
      {PARTS.map((p, i) => (
        <g
          key={i}
          className="venn-part"
          style={{ "--from-x": `${p.from[0]}px`, "--from-y": `${p.from[1]}px`, "--delay": `${i * 180}ms` } as React.CSSProperties}
        >
          <Wash d={blob(p.cx + 5, p.cy + 4, R, R, 30 + i, 0.05, 12)} color={p.color} opacity={0.9} />
          <Ink d={blob(p.cx, p.cy, R, R, 40 + i, 0.025, 12)} />
          <text
            x={p.label[0]}
            y={p.label[1]}
            textAnchor="middle"
            className="fill-ink-strong font-serif text-[22px] font-semibold tracking-[5px]"
          >
            {labels[i]}
          </text>
        </g>
      ))}
      <g className="venn-seal">
        <rect x={220} y={180} width={40} height={52} rx={3} style={{ fill: "var(--color-seal)" }} />
        <rect x={223} y={183} width={34} height={46} rx={2} fill="none" stroke="#fff" strokeOpacity={0.85} />
        <text x={240} y={204} textAnchor="middle" className="fill-white font-serif text-[18px] font-bold">左</text>
        <text x={240} y={224} textAnchor="middle" className="fill-white font-serif text-[18px] font-bold">岸</text>
      </g>
    </svg>
  );
}
