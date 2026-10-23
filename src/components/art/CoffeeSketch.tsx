import { Ink, Paper, WASH, Wash, blob } from "./sketch";

const COFFEE = "#d9b27c";
const ellipse = (cx: number, cy: number, rx: number, ry: number) =>
  `M${cx - rx} ${cy} a${rx} ${ry} 0 1 0 ${rx * 2} 0 a${rx} ${ry} 0 1 0 ${-rx * 2} 0`;

/** 系友園地的插畫：桌上兩杯冒著熱氣的咖啡（約系友喝一杯咖啡） */
export function CoffeeSketch() {
  const cup1 = "M72 118 C72 150 84 176 110 176 C136 176 148 150 148 118";
  const cup2 = "M204 112 C204 138 214 156 232 156 C250 156 260 138 260 112";
  return (
    <svg viewBox="0 0 320 240" className="w-full overflow-visible" aria-hidden>
      <Wash d={blob(168, 132, 136, 96, 17, 0.12)} color={WASH.sage} opacity={0.65} />
      <Ink d="M10 198 C100 206 220 206 310 196" className="ink-faint" />

      {/* 後面那杯 */}
      <Ink d={ellipse(232, 160, 44, 9)} />
      <Paper d={`${cup2} Z`} />
      <Wash d={ellipse(232, 113, 23, 5)} color={COFFEE} opacity={1} />
      <Ink d={`${cup2} ${ellipse(232, 112, 28, 7)} M205 120 c-18 -4 -20 20 2 23`} />
      <Ink d="M226 94 c-7 -10 7 -15 0 -24 c-7 -10 6 -15 0 -22 M240 92 c-6 -8 6 -13 0 -21" className="ink-faint" />

      {/* 前面那杯，拿鐵拉花＋湯匙 */}
      <Ink d={`${ellipse(110, 182, 58, 12)} ${ellipse(110, 180, 36, 7)}`} />
      <Paper d={`${cup1} Z`} />
      <Wash d={ellipse(110, 119, 33, 6.5)} color={COFFEE} opacity={1} />
      <Ink d={`${cup1} ${ellipse(110, 118, 38, 9)} M147 128 c22 -6 26 26 -3 30`} />
      <Ink d="M104 119 c-5 -5 3 -9 6 -3 c3 -6 11 -2 6 3 l-6 4 z" className="ink-faint" />
      <Ink d="M98 100 c-9 -12 9 -18 0 -30 c-9 -12 7 -18 0 -26 M120 96 c-7 -10 9 -16 0 -26" className="ink-faint" />
      <Ink d="M156 188 l46 12 M200 199 c4 -4 12 -2 11 3 c-1 4 -9 4 -11 -3" />
    </svg>
  );
}
