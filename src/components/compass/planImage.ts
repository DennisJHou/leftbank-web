/**
 * 把處置包畫成一張直式長圖（PNG），讓學生截圖留存或傳給自己。
 * 直接用 Canvas 2D 繪製（不用額外套件），字型沿用網頁已載入的 Noto Sans／Serif TC。
 */
import { SUBSCALES } from "@/lib/cddq";
import { COMPONENT_LABEL } from "@/lib/agent/copy";
import type { ResolvedPlan } from "@/lib/agent/types";

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
  washes: ["#ebcabd", "#f0d9a5", "#cfd9bf"],
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

export async function renderPlanImage(plan: ResolvedPlan, meta: PlanImageMeta): Promise<Blob> {
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

  // ── 焦點
  plan.focuses.forEach((f, i) => {
    space(48);
    ops.push((ctx, y) => {
      ctx.fillStyle = C.washes[i % 3];
      ctx.beginPath();
      ctx.arc(PAD + 34, y + 34, 34, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = C.strong;
      ctx.font = `400 34px ${serif}`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(NUMERALS[i] ?? String(i + 1), PAD + 34, y + 36);
      ctx.textAlign = "left";
      ctx.textBaseline = "top";
      ctx.font = `500 42px ${serif}`;
      ctx.fillText(f.title, PAD + 92, y + 6);
      ctx.fillStyle = C.ash;
      ctx.font = `400 24px ${sans}`;
      ctx.fillText(`${SUBSCALES[f.subscale].label}${f.changed ? "・這次新出現" : ""}`, PAD + 92, y + 60);
      return y + 104;
    });
    text(f.why, { size: 29, color: C.ink, lh: 1.8, gap: 26 });

    const block = (label: string, body: string, accent: string) => {
      text(label, { size: 24, color: accent, weight: 500, gap: 6 });
      text(body, { size: 30, color: C.strong, lh: 1.75, gap: 24 });
    };
    block("這週可以做的一件事", f.action, C.chart);
    block("書寫練習", f.writing_prompt, C.chart);

    if (f.quote) {
      const q = f.quote;
      measure.font = `400 29px ${serif}`;
      const lines = wrap(measure, `「${q.text}」`, INNER - 56);
      const by = `— ${q.name}${q.title ? `，${q.title}` : ""}`;
      ops.push((ctx, y) => {
        const h = lines.length * 29 * 1.8 + 64;
        ctx.fillStyle = C.hair;
        ctx.fillRect(PAD, y, 5, h);
        ctx.fillStyle = C.ink;
        ctx.font = `400 29px ${serif}`;
        ctx.textBaseline = "top";
        lines.forEach((l, j) => ctx.fillText(l, PAD + 32, y + j * 29 * 1.8 + 6));
        ctx.fillStyle = C.ash;
        ctx.font = `400 24px ${sans}`;
        ctx.fillText(by, PAD + 32, y + lines.length * 29 * 1.8 + 18);
        return y + h + 24;
      });
    }
    if (f.resources.length) {
      text("可以使用的資源", { size: 24, color: C.river, weight: 500, gap: 8 });
      f.resources.forEach((r) => text(`・${r.title}（${r.provider}）`, { size: 27, color: C.ink, lh: 1.6, gap: 4 }));
      space(12);
    }
    text(f.components.map((c) => COMPONENT_LABEL[c]).join("　"), { size: 22, color: C.ash, gap: 40 });
    rule();
  });

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
