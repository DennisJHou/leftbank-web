/** 首頁插畫共用的小工具：固定種子的亂數、鋼筆線條、水彩色塊、手繪圓、椰子樹 */

export const WASH = {
  sage: "#cfd9bf",
  ochre: "#f0d9a5",
  clay: "#ebcabd",
  river: "#d3e4de",
  bulb: "#e9bb62",
  seal: "#c9806c",
};

/** 讓 path 字串短一點：四捨五入到小數一位 */
export const r1 = (n: number) => Math.round(n * 10) / 10;

export type Pt = [number, number];

/** 固定種子的亂數（mulberry32），伺服器與瀏覽器畫出來的圖一模一樣 */
export function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** 鋼筆線條。pathLength=1 讓 CSS 可以把它「一筆畫出來」 */
export function Ink({ d, className = "" }: { d: string; className?: string }) {
  return <path d={d} pathLength={1} className={`ink ${className}`} />;
}

/** 水彩色塊（multiply 疊色，兩塊重疊處會變深） */
export function Wash({ d, color, opacity = 0.8 }: { d: string; color: string; opacity?: number }) {
  return <path d={d} fill={color} fillOpacity={opacity} className="wash" />;
}

/** 遮住後方線條的實心底（建築物等），顏色跟紙一樣 */
export function Paper({ d }: { d: string }) {
  return <path d={d} style={{ fill: "var(--color-canvas)" }} />;
}

/** 不規則的圓：在橢圓上加一點雜訊，再用平滑曲線連起來。水彩色塊、手繪圓都用它 */
export function blob(cx: number, cy: number, rx: number, ry: number, seed: number, jitter = 0.16, n = 9) {
  const rand = rng(seed);
  const pts: Pt[] = Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2;
    const k = 1 + (rand() - 0.5) * 2 * jitter;
    return [cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k];
  });
  let d = `M${r1(pts[0][0])} ${r1(pts[0][1])}`;
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n];
    const p1 = pts[i];
    const p2 = pts[(i + 1) % n];
    const p3 = pts[(i + 2) % n];
    const c1: Pt = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2: Pt = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C${r1(c1[0])} ${r1(c1[1])} ${r1(c2[0])} ${r1(c2[1])} ${r1(p2[0])} ${r1(p2[1])}`;
  }
  return d + "Z";
}

/** 正圓的 path（給小燈泡、人頭這類不需要抖動的圓） */
export function circle(cx: number, cy: number, rad: number) {
  return `M${r1(cx - rad)} ${r1(cy)} a${rad} ${rad} 0 1 0 ${r1(rad * 2)} 0 a${rad} ${rad} 0 1 0 ${r1(-rad * 2)} 0`;
}

/** 二次貝茲曲線上 t 位置的點 */
export function quad(p0: Pt, p1: Pt, p2: Pt, t: number): Pt {
  const u = 1 - t;
  return [u * u * p0[0] + 2 * u * t * p1[0] + t * t * p2[0], u * u * p0[1] + 2 * u * t * p1[1] + t * t * p2[1]];
}

// 葉子的角度（度）：0 = 向右、90 = 向上
const FRONDS = [170, 146, 122, 98, 66, 38, 12];

/** 椰子樹（臺大椰林）：兩條樹幹線、幾圈樹紋、往下垂的葉子。回傳線條與樹冠的色塊 */
export function palm(x: number, y: number, h: number, lean = 0) {
  const top: Pt = [x + lean, y - h];
  const ctrl: Pt = [x + lean * 0.15, y - h * 0.55];
  const w0 = Math.max(2.5, h * 0.028);
  const w1 = Math.max(1.6, h * 0.016);
  const mid = (w0 + w1) / 2;
  const parts = [
    `M${r1(x - w0)} ${y} Q${r1(ctrl[0] - mid)} ${r1(ctrl[1])} ${r1(top[0] - w1)} ${r1(top[1])}`,
    `M${r1(x + w0)} ${y} Q${r1(ctrl[0] + mid)} ${r1(ctrl[1])} ${r1(top[0] + w1)} ${r1(top[1])}`,
  ];
  const rings = Math.max(3, Math.round(h / 20));
  for (let i = 1; i < rings; i++) {
    const t = i / rings;
    const [bx, by] = quad([x, y], ctrl, top, t);
    const w = w0 + (w1 - w0) * t;
    parts.push(`M${r1(bx - w)} ${r1(by)} q${r1(w)} 2.4 ${r1(w * 2)} 0`);
  }
  const L = h * 0.4;
  for (const deg of FRONDS) {
    const a = (deg * Math.PI) / 180;
    const cos = Math.cos(a);
    const sin = Math.sin(a);
    const droop = L * 0.38 * (1 - sin * 0.7); // 越水平的葉子垂得越多
    const end: Pt = [top[0] + cos * L, top[1] - sin * L * 0.55 + droop];
    const c: Pt = [top[0] + cos * L * 0.55, top[1] - sin * L * 0.7 - L * 0.14];
    parts.push(`M${r1(top[0])} ${r1(top[1])} Q${r1(c[0])} ${r1(c[1])} ${r1(end[0])} ${r1(end[1])}`);
    // 小葉：沿著葉軸往外下方撇
    const side = cos >= 0 ? 1 : -1;
    for (const t of [0.32, 0.48, 0.64, 0.8, 0.94]) {
      const [px, py] = quad(top, c, end, t);
      const len = L * 0.17 * (1 - t * 0.45);
      parts.push(`M${r1(px)} ${r1(py)} l${r1(side * len * 0.35)} ${r1(len)}`);
    }
  }
  return {
    ink: parts.join(" "),
    crown: blob(top[0] + 4, top[1] + L * 0.1, L * 0.9, L * 0.4, Math.round(x * 7 + h)),
  };
}

/** 草叢：三根往不同方向彎的草 */
export function tuft(x: number, y: number, h: number) {
  return [
    `M${x} ${y} q-2 ${r1(-h * 0.6)} -7 ${r1(-h)}`,
    `M${x} ${y} q1 ${r1(-h * 0.75)} 3 ${r1(-h * 1.15)}`,
    `M${x} ${y} q3 ${r1(-h * 0.5)} 9 ${r1(-h * 0.8)}`,
  ].join(" ");
}
