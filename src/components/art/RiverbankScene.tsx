import { Ink, Paper, WASH, Wash, blob, circle, palm, quad, r1, rng, tuft, type Pt } from "./sketch";

/*
 * 首頁主視覺：鋼筆線條＋水彩色塊的河岸風景。
 * 左岸是亮著燈的咖啡館，兩個人坐在戶外喝咖啡聊天；一座拱橋通往對岸的椰林與紅磚校舍。
 * 分成遠、中、近、前四層，各自是一張 SVG，捲動時用不同速度位移，做出景深。
 */

const VIEWBOX = "0 0 1600 560";

/* ─── 遠景：山、太陽、雲、飛鳥、遠方的城市 ─── */

const MOUNTAIN_L = "M0 252 C60 230 120 206 196 214 C262 221 300 196 372 192 C440 188 500 220 548 252 C580 272 610 292 640 304";
const MOUNTAIN_R = "M930 300 C980 270 1030 236 1096 228 C1160 220 1200 244 1262 238 C1330 232 1380 200 1452 202 C1510 204 1560 222 1600 232";
const HILLS = [
  "M0 292 C90 280 170 270 250 282 C330 294 400 300 470 312",
  "M1000 318 C1080 300 1160 296 1240 304 C1330 312 1420 296 1600 290",
];
const HORIZON = "M560 330 C620 329 700 331 760 330 C820 329 900 331 980 330";
const SUN = "M1164.7 140 A46 46 0 1 1 1239.6 167.2";
const CLOUDS = [
  "M132 122 H272 M146 122 c-4 -12 10 -20 22 -14 c6 -16 34 -18 40 -2 c10 -6 26 0 24 16",
  "M1100 196 c40 -6 80 -4 120 2 M1130 206 c30 -3 60 -2 90 2",
];
const BIRDS = ["M1010 118 q7 -7 14 0 q7 -7 14 0", "M1046 100 q5 -5 10 0 q5 -5 10 0", "M986 92 q4 -4 8 0 q4 -4 8 0"];

/** 遠方的城市輪廓與窗格 */
function skyline(x0: number, x1: number, base: number, seed: number) {
  const rand = rng(seed);
  const windows: string[] = [];
  let d = `M${x0} ${base}`;
  let x = x0;
  while (x < x1 - 4) {
    const w = Math.min(14 + rand() * 24, x1 - x);
    const h = 10 + rand() * 30 + (rand() > 0.8 ? 24 : 0);
    d += ` V${r1(base - h)} H${r1(x + w)}`;
    if (w > 18 && h > 22) {
      for (let wy = base - h + 7; wy < base - 6; wy += 9) {
        for (let wx = x + 5; wx < x + w - 4; wx += 6) windows.push(`M${r1(wx)} ${r1(wy)} v2.5`);
      }
    }
    x += w;
  }
  return [d + ` V${base}`, ...windows].join(" ");
}

/* ─── 中景：河、橋、對岸的紅磚校舍 ─── */

const BANK_L = "M660 332 C640 390 600 470 560 560";
const BANK_R = "M800 332 C900 390 1060 470 1240 560";
const RIVER = `${BANK_L} L1240 560 C1060 470 900 390 800 332 Z`;
const LAWN_R = `${BANK_R} H1600 V332 Z`;
const LAWN_L = `M0 330 H660 C640 390 600 470 560 560 H0 Z`;

const RIPPLES: [number, number, number][] = [
  [706, 344, 10], [738, 352, 12], [770, 340, 8],
  [650, 432, 22], [760, 440, 34], [880, 436, 26],
  [700, 468, 30], [830, 474, 40], [960, 470, 30],
  [640, 506, 36], [760, 512, 44], [900, 508, 38], [1040, 516, 34],
  [700, 546, 40], [850, 548, 50], [990, 548, 44], [1110, 546, 30],
];
const ripples = RIPPLES.map(([x, y, len], i) =>
  `M${x} ${y} q${r1(len / 2)} -3.5 ${len} 0` + (i % 2 ? ` m${r1(-len * 0.8)} 6 q${r1(len * 0.3)} -2.5 ${r1(len * 0.6)} 0` : ""),
).join(" ");

/** 拱橋：橋面、欄杆、拱圈，以及中間的直柱 */
function bridge() {
  const rail: [Pt, Pt, Pt] = [[610, 374], [772, 312], [934, 374]];
  const deck: [Pt, Pt, Pt] = [[604, 392], [772, 330], [940, 392]];
  const under: [Pt, Pt, Pt] = [[604, 401], [772, 339], [940, 401]];
  const arch: [Pt, Pt, Pt] = [[646, 412], [772, 346], [898, 412]];
  const curve = ([a, b, c]: [Pt, Pt, Pt]) => `M${a[0]} ${a[1]} Q${b[0]} ${b[1]} ${c[0]} ${c[1]}`;
  const parts = [curve(rail), curve(deck), curve(under), curve(arch)];
  for (let t = 0.04; t < 0.97; t += 0.064) {
    const [rx, ry] = quad(...rail, t);
    const [dx, dy] = quad(...deck, t);
    parts.push(`M${r1(rx)} ${r1(ry)} L${r1(dx)} ${r1(dy)}`);
  }
  // 拱圈與橋面之間的短柱：橋面與拱圈的 x 都隨 t 線性變化，可以直接換算
  for (let x = 676; x <= 868; x += 32) {
    const tu = (x - 604) / 336;
    const ta = (x - 646) / 252;
    parts.push(`M${x} ${r1(quad(...under, tu)[1])} L${x} ${r1(quad(...arch, ta)[1])}`);
  }
  parts.push("M604 392 L596 414 H650", "M940 392 L948 414 H894");
  return parts.join(" ");
}
const BRIDGE_REFLECTION = "M655 420 Q772 484 890 420";

/** 對岸的紅磚校舍：屋頂、中央塔樓、一整排拱廊 */
function hall() {
  const parts = [
    "M972 372 V318 M1348 318 V372",
    "M956 318 L986 298 H1334 L1364 318 Z",
    "M971 308 H1349",
    "M972 330 H1348",
    "M1130 298 V276 L1160 258 L1190 276 V298",
    circle(1160, 284, 6),
    "M936 374 H1400",
  ];
  for (let x = 984; x < 1336; x += 28) parts.push(`M${x} 372 V358 a9 9 0 0 1 18 0 V372`);
  for (let x = 986; x < 1336; x += 28) parts.push(`M${x} 336 h12 v12 h-12 z`);
  return parts.join(" ");
}
const HALL_SHAPE = "M972 372 V318 H956 L986 298 H1130 V276 L1160 258 L1190 276 V298 H1334 L1364 318 H1348 V372 Z";

/* ─── 近景：咖啡館、兩個人、路燈、串燈、椰子樹 ─── */

const CAFE_SHAPE = "M80 452 V235 H66 L96 190 H314 L344 235 H330 V452 Z";
const AWNING = { top: [72, 338] as const, bottom: [58, 352] as const, y0: 324, y1: 352, stripes: 9 };

function cafe() {
  const parts = [
    "M82 452 V235 M328 235 V452",
    "M66 235 L96 190 H314 L344 235 Z",
    "M81 213 H329",
    "M282 190 V168 H300 V190 M278 168 H304",
    "M82 318 H328",
    "M30 452 H600",
  ];
  for (const x of [130, 205, 280]) parts.push(`M${x - 11} 232 V218 Q${x} 204 ${x + 11} 218 V232`);
  for (const x of [104, 184, 264]) {
    parts.push(`M${x} 252 h42 v50 h-42 z M${x + 21} 252 v50 M${x} 277 h42`);
    parts.push(`M${x - 4} 306 h50 M${x - 4} 306 v8 M${x + 46} 306 v8 M${x - 4} 314 h50`);
  }
  // 遮雨棚：外框、條紋、波浪邊
  const { top, bottom, y0, y1, stripes } = AWNING;
  parts.push(`M${top[0]} ${y0} H${top[1]} L${bottom[1]} ${y1} H${bottom[0]} Z`);
  for (let i = 1; i < stripes; i++) {
    const tx = top[0] + ((top[1] - top[0]) * i) / stripes;
    const bx = bottom[0] + ((bottom[1] - bottom[0]) * i) / stripes;
    parts.push(`M${r1(tx)} ${y0} L${r1(bx)} ${y1}`);
  }
  const scallop = (bottom[1] - bottom[0]) / 14;
  parts.push(`M${bottom[0]} ${y1}` + ` q${r1(scallop / 2)} 10 ${r1(scallop)} 0`.repeat(14));
  // 一樓的大窗與門
  for (const x of [96, 234]) parts.push(`M${x} 370 h80 v70 h-80 z M${x + 40} 370 v70 M${x} 395 h80`);
  parts.push("M192 452 V382 Q205 366 218 382 V452", "M212 418 v4");
  return parts.join(" ");
}

function awningStripes() {
  const { top, bottom, y0, y1, stripes } = AWNING;
  const at = (i: number) => [top[0] + ((top[1] - top[0]) * i) / stripes, bottom[0] + ((bottom[1] - bottom[0]) * i) / stripes];
  const out: string[] = [];
  for (let i = 0; i < stripes; i += 2) {
    const [t0, b0] = at(i);
    const [t1, b1] = at(i + 1);
    out.push(`M${r1(t0)} ${y0} H${r1(t1)} L${r1(b1)} ${y1} H${r1(b0)} Z`);
  }
  return out.join(" ");
}

/** 戶外的小圓桌、兩杯咖啡、面對面聊天的兩個人 */
const CONVERSATION = [
  // 桌子與咖啡
  "M431 466 a24 5 0 1 0 48 0 a24 5 0 1 0 -48 0",
  "M455 471 V503 M443 505 Q455 500 467 505",
  "M440 458 V465 H449 V458 M440 460 q-4 1 0 4",
  "M461 458 V465 H470 V458 M470 460 q4 1 0 4",
  "M444 452 c-3 -4 3 -6 0 -11 M466 452 c3 -4 -3 -6 0 -11",
  // 左邊的人（面向右）與椅子
  "M392 478 H416 M395 478 V505 M414 478 V505 M392 478 L388 446",
  circle(404, 428, 9),
  "M396 425 Q400 416 410 420",
  "M398 440 Q393 460 400 477 H420 Q426 490 424 503 H432",
  "M404 446 Q418 458 436 461",
  // 右邊的人（面向左）與椅子，綁著馬尾
  "M494 478 H518 M496 478 V505 M515 478 V505 M518 478 L522 446",
  circle(506, 427, 9),
  "M499 422 Q506 413 514 421 M514 424 Q520 434 515 444",
  "M512 440 Q517 460 510 477 H490 Q484 490 486 503 H478",
  "M506 446 Q492 456 474 460",
];

const LAMP = "M566 478 V336 M558 478 H574 M554 336 H578 L572 318 H560 Z M566 318 V310";
const STRING: [Pt, Pt, Pt] = [[330, 290], [450, 350], [562, 322]];
const bulbs = Array.from({ length: 9 }, (_, i) => quad(...STRING, (i + 1) / 10));

const PALMS_NEAR = [palm(372, 452, 258, 16), palm(902, 404, 118, -6), palm(1012, 446, 150, 8), palm(1388, 470, 196, -10), palm(1528, 552, 268, 12)];
const PALMS_FAR = [palm(1050, 340, 92, -4), palm(1250, 340, 104, 5)];

/* ─── 前景：河邊與畫面下緣的草 ─── */

const TUFTS: [number, number, number][] = [
  [546, 552, 26], [568, 530, 20], [590, 500, 16],
  [1160, 522, 20], [1196, 544, 26], [1238, 558, 30],
  [18, 560, 42], [52, 560, 32], [96, 560, 46], [140, 560, 30],
  [1480, 560, 36], [1522, 560, 48], [1566, 560, 34],
];

type Layer = { delay: number; shift: number; children: React.ReactNode };

function SceneLayer({ delay, shift, children }: Layer) {
  return (
    <svg
      viewBox={VIEWBOX}
      preserveAspectRatio="xMidYMax meet"
      className="parallax-exit overflow-visible"
      style={{ "--d": `${delay}ms`, "--shift": `${shift}px` } as React.CSSProperties}
      aria-hidden
    >
      {children}
    </svg>
  );
}

export function RiverbankScene({ image, className = "" }: { image?: string; className?: string }) {
  if (image) {
    return (
      <div className={`scene ${className}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={image} alt="" className="object-cover [mask-image:linear-gradient(to_bottom,transparent,black_35%)]" />
      </div>
    );
  }
  return (
    <div
      className={`scene draw-in ${className}`}
      role="img"
      aria-label="鋼筆線條畫：河的左岸有一間亮著燈的咖啡館，兩個人坐在戶外喝咖啡聊天；一座拱橋通往對岸的椰林與紅磚校舍。"
    >
      <SceneLayer delay={0} shift={70}>
        <Wash d={`${MOUNTAIN_L} L640 330 L0 330 Z`} color={WASH.sage} opacity={0.55} />
        <Wash d={`${MOUNTAIN_R} L1600 330 L930 330 Z`} color={WASH.sage} opacity={0.55} />
        <Wash d={blob(1210, 132, 46, 46, 11, 0.06)} color={WASH.ochre} opacity={0.9} />
        <Ink d={MOUNTAIN_L} />
        <Ink d={MOUNTAIN_R} />
        {HILLS.map((d) => <Ink key={d} d={d} className="ink-faint" />)}
        <Ink d={HORIZON} className="ink-faint" />
        <Ink d={SUN} className="ink-faint" />
        {CLOUDS.map((d) => <Ink key={d} d={d} className="ink-faint" />)}
        {BIRDS.map((d) => <Ink key={d} d={d} />)}
        <Ink d={skyline(820, 950, 330, 7)} className="ink-faint" />
        <Ink d={skyline(1380, 1600, 330, 19)} className="ink-faint" />
      </SceneLayer>

      <SceneLayer delay={250} shift={40}>
        <Wash d={LAWN_R} color={WASH.sage} opacity={0.35} />
        <Wash d={LAWN_L} color={WASH.sage} opacity={0.3} />
        <Wash d={RIVER} color={WASH.river} opacity={0.9} />
        {PALMS_FAR.map((p, i) => <Wash key={i} d={p.crown} color={WASH.sage} />)}
        {PALMS_FAR.map((p, i) => <Ink key={i} d={p.ink} className="ink-faint" />)}
        <Paper d={HALL_SHAPE} />
        <Wash d="M978 322 H1352 V376 H978 Z" color={WASH.clay} opacity={0.75} />
        <Ink d={hall()} />
        <Ink d={BANK_L} />
        <Ink d={BANK_R} />
        <Ink d={ripples} className="ink-faint" />
        <Ink d={BRIDGE_REFLECTION} className="ink-faint" />
        <Ink d={bridge()} />
      </SceneLayer>

      <SceneLayer delay={500} shift={14}>
        <Wash d={blob(455, 498, 130, 16, 5)} color={WASH.ochre} opacity={0.6} />
        <Paper d={CAFE_SHAPE} />
        <Wash d={awningStripes()} color={WASH.clay} />
        <Wash d="M100 374 h80 v70 h-80 z M238 374 h80 v70 h-80 z M108 256 h42 v50 h-42 z M188 256 h42 v50 h-42 z M268 256 h42 v50 h-42 z" color={WASH.ochre} opacity={0.9} />
        <Wash d={blob(566, 330, 36, 30, 3)} color={WASH.ochre} />
        {PALMS_NEAR.map((p, i) => <Wash key={i} d={p.crown} color={WASH.sage} opacity={0.75} />)}
        <Ink d={cafe()} />
        <text x="205" y="343" textAnchor="middle" className="after-draw fill-[var(--color-ink-line)] font-serif text-[11px] tracking-[3px]">
          RIVE GAUCHE
        </text>
        <Ink d={`M${STRING[0][0]} ${STRING[0][1]} Q${STRING[1][0]} ${STRING[1][1]} ${STRING[2][0]} ${STRING[2][1]}`} className="ink-faint" />
        {bulbs.map(([x, y], i) => <Wash key={i} d={circle(x, y + 5, 3.5)} color={WASH.bulb} opacity={1} />)}
        <Ink d={bulbs.map(([x, y]) => `M${r1(x)} ${r1(y)} v2`).join(" ")} className="ink-faint" />
        <Ink d={LAMP} />
        {PALMS_NEAR.map((p, i) => <Ink key={i} d={p.ink} />)}
        {CONVERSATION.map((d) => <Ink key={d} d={d} />)}
      </SceneLayer>

      <SceneLayer delay={900} shift={-24}>
        <Ink d={TUFTS.map(([x, y, h]) => tuft(x, y, h)).join(" ")} />
      </SceneLayer>
    </div>
  );
}
