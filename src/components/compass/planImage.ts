/**
 * 把生涯報告畫成一張直式長圖（PNG），讓學生截圖留存或傳給自己。
 * 直接用 Canvas 2D 繪製（不用額外套件），字型沿用網頁已載入的 Noto Sans／Serif TC。
 */
import { SUBSCALES } from "@/lib/cddq";
import type { PlanAlumni, ResolvedPlan } from "@/lib/agent/types";

export type PlanImageMeta = { date: string; routeTitle: string; routeText: string; heading: string };

const W = 1080;
const PAD = 72;
const INNER = W - PAD * 2;
const C = {
  canvas: "#fbfaf4",
  paper: "#ffffff",
  ink: "#383530",
  strong: "#1d1d1b",
  ash: "#5f5e58",
  hair: "#e3e0d3",
  river: "#2f5d50",
  riverWash: "#d3e4de",
  chart: "#9a5f17",
};
const NUMERALS = ["一", "二", "三"];
const NO_LINE_START = "，。、！？；：」』）》〉…—,.!?;:)";

function fontStacks() {
  const sans = getComputedStyle(document.body).fontFamily || "sans-serif";
  const h = document.querySelector("h1, h2");
  const serif = h ? getComputedStyle(h).fontFamily : "serif";
  return { sans, serif };
}

/** 中文逐字斷行，避免標點出現在行首 */
function wrap(ctx: CanvasRenderingContext2D, text: string, width: number): string[] {
  const lines: string[] = [];
  for (const para of text.split("\n")) {
    let line = "";
    for (const ch of [...para]) {
      if (ctx.measureText(line + ch).width > width && line) {
        if (NO_LINE_START.includes(ch)) {
          line += ch;
          continue;
        }
        lines.push(line);
        line = ch;
      } else line += ch;
    }
    lines.push(line);
  }
  return lines;
}

type Op = (ctx: CanvasRenderingContext2D, y: number) => number;

export async function renderPlanImage(plan: ResolvedPlan, meta: PlanImageMeta, alumni: PlanAlumni[] = []): Promise<Blob> {
  await document.fonts?.ready;
  const { sans, serif } = fontStacks();
  const measure = document.createElement("canvas").getContext("2d")!;

  // 先排版（量高度），再實際繪製
  const ops: Op[] = [];
  const text = (s: string, o: { size: number; color?: string; family?: string; weight?: number; lh?: number; x?: number; width?: number; gap?: number }) => {
    const font = `${o.weight ?? 400} ${o.size}px ${o.family ?? sans}`;
    measure.font = font;
    const lines = wrap(measure, s, o.width ?? INNER);
    const lh = o.size * (o.lh ?? 1.7);
    ops.push((ctx, y) => {
      ctx.font = font;
      ctx.fillStyle = o.color ?? C.ink;
      ctx.textBaseline = "top";
      lines.forEach((l, i) => ctx.fillText(l, o.x ?? PAD, y + i * lh + (lh - o.size) / 2));
      return y + lines.length * lh + (o.gap ?? 0);
    });
  };
  const space = (h: number) => ops.push((_c, y) => y + h);
  const rule = () =>
    ops.push((ctx, y) => {
      ctx.fillStyle = C.hair;
      ctx.fillRect(PAD, y, INNER, 2);
      return y + 2;
    });

  // ── 頁首
  space(80);
  text(`左岸計畫・職涯羅盤　${meta.date}`, { size: 26, color: C.river, weight: 500, gap: 18 });
  text(meta.heading, { size: 56, color: C.strong, family: serif, lh: 1.4, gap: 28 });
  ops.push((ctx, y) => {
    // 分流路徑：淡綠底的小框
    measure.font = `400 28px ${sans}`;
    const lines = wrap(measure, meta.routeText, INNER - 64);
    const h = 40 + 44 + lines.length * 28 * 1.7 + 34;
    ctx.fillStyle = C.riverWash;
    roundRect(ctx, PAD, y, INNER, h, 18);
    ctx.fill();
    ctx.fillStyle = C.river;
    ctx.font = `500 32px ${sans}`;
    ctx.textBaseline = "top";
    ctx.fillText(meta.routeTitle, PAD + 32, y + 36);
    ctx.fillStyle = C.ink;
    ctx.font = `400 28px ${sans}`;
    lines.forEach((l, i) => ctx.fillText(l, PAD + 32, y + 36 + 56 + i * 28 * 1.7));
    return y + h;
  });
  space(40);
  text(plan.overview, { size: 32, color: C.ink, lh: 1.8, gap: 40 });
  rule();

  // ── 焦點：和網頁一樣，一條一條的建議（左邊標籤、右邊內容）
  const LABEL_W = 230;
  const item = (label: string, body: string, sub?: string) => {
    measure.font = `400 27px ${sans}`;
    const lines = wrap(measure, body, INNER - LABEL_W);
    measure.font = `400 24px ${sans}`;
    const subLines = sub ? wrap(measure, sub, INNER - LABEL_W) : [];
    ops.push((ctx, y) => {
      const top = y + 22;
      ctx.textBaseline = "top";
      ctx.fillStyle = C.river;
      ctx.font = `500 31px ${serif}`;
      ctx.fillText(label, PAD, top);
      ctx.fillStyle = C.ink;
      ctx.font = `400 27px ${sans}`;
      lines.forEach((l, j) => ctx.fillText(l, PAD + LABEL_W, top + 2 + j * 27 * 1.75));
      let yy = top + 2 + lines.length * 27 * 1.75;
      ctx.fillStyle = C.ash;
      ctx.font = `400 24px ${sans}`;
      subLines.forEach((l, j) => ctx.fillText(l, PAD + LABEL_W, yy + 4 + j * 24 * 1.6));
      yy += subLines.length ? subLines.length * 24 * 1.6 + 4 : 0;
      ctx.fillStyle = C.hair;
      ctx.fillRect(PAD, yy + 20, INNER, 2);
      return yy + 22;
    });
  };
  const hostOf = (u: string) => {
    try {
      return new URL(u, location.origin).hostname.replace(/^www\./, "");
    } catch {
      return "";
    }
  };

  plan.focuses.forEach((f, i) => {
    space(56);
    text(`${NUMERALS[i] ?? i + 1}、${f.title}`, { size: 44, color: C.strong, family: serif, lh: 1.4, gap: 4 });
    const sub = f.title !== SUBSCALES[f.subscale].label ? SUBSCALES[f.subscale].label : "";
    if (sub) text(sub, { size: 24, color: C.ash, gap: 16 });
    else space(12);
    text(f.why, { size: 28, color: C.ash, lh: 1.8, gap: 12 });
    ops.push((ctx, y) => {
      ctx.fillStyle = C.hair;
      ctx.fillRect(PAD, y, INNER, 2);
      return y + 2;
    });
    item("下一步行動", f.action);
    const res = [
      ...f.links.map((l) => `・${l.title}（${l.campus ? "校內" : "校外"}，${hostOf(l.url)}）`),
      ...f.resources.map((r) => `・${r.title}（${r.provider}）`),
    ];
    if (res.length) item("身邊的資源", res.join("\n"));
    item("寫下你的想法", f.writing_prompt);
    if (f.quote) item("看看系友故事", `「${f.quote.text}」`, `— ${f.quote.name}${f.quote.title ? `，${f.quote.title}` : ""}`);
  });

  if (alumni.length) {
    space(56);
    text("推薦你聯絡的系友", { size: 44, color: C.strong, family: serif, lh: 1.4, gap: 16 });
    ops.push((ctx, y) => {
      ctx.fillStyle = C.hair;
      ctx.fillRect(PAD, y, INNER, 2);
      return y + 2;
    });
    alumni.forEach((a) =>
      item(
        a.name,
        a.title ?? "心理系系友",
        [a.tagline ? `「${a.tagline}」` : "", [a.accept_question && "可線上提問", a.accept_coffee && "可約咖啡"].filter(Boolean).join("・")].filter(Boolean).join(" "),
      ),
    );
  }
  space(24);

  // ── 頁尾
  space(40);
  text("這不是心理診斷。如果最近壓力很大，可以找臺大學生心理輔導中心，或撥 24 小時安心專線 1925。", { size: 23, color: C.ash, lh: 1.7, gap: 12 });
  text("臺大心理系・左岸計畫", { size: 26, color: C.river, weight: 500, family: serif });
  space(80);

  // 量高度
  const dry = document.createElement("canvas").getContext("2d")!;
  const height = Math.ceil(ops.reduce((y, op) => op(dry, y), 0));

  const scale = 1;
  const canvas = document.createElement("canvas");
  canvas.width = W * scale;
  canvas.height = height * scale;
  const ctx = canvas.getContext("2d")!;
  ctx.scale(scale, scale);
  ctx.fillStyle = C.canvas;
  ctx.fillRect(0, 0, W, height);
  ctx.fillStyle = C.chart;
  ctx.fillRect(0, 0, W, 10);
  ops.reduce((y, op) => op(ctx, y), 0);

  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("toBlob failed"))), "image/png"));
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
