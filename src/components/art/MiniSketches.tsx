import { Ink, WASH, Wash, blob, circle } from "./sketch";

/** 量表：夾板上的勾選清單 */
export function ScaleSketch({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 120" className={`overflow-visible ${className}`} aria-hidden>
      <Wash d={blob(64, 64, 50, 48, 23, 0.14)} color={WASH.ochre} opacity={0.85} />
      <Ink d="M28 18 h64 v92 h-64 z M46 11 h28 v13 h-28 z" />
      <Ink d="M38 40 h11 v11 h-11 z M38 63 h11 v11 h-11 z M38 86 h11 v11 h-11 z" />
      <Ink d="M40 45 l3.5 3.5 l7 -8 M40 68 l3.5 3.5 l7 -8" className="ink-bold" />
      <Ink d="M57 46 h26 M57 69 h20 M57 92 h24" className="ink-faint" />
    </svg>
  );
}

/** AI 對談：一來一往的兩個對話框 */
export function ChatSketch({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 120" className={`overflow-visible ${className}`} aria-hidden>
      <Wash d={blob(46, 42, 40, 30, 31, 0.14)} color={WASH.sage} opacity={0.85} />
      <Wash d={blob(78, 88, 34, 24, 37, 0.14)} color={WASH.river} opacity={0.95} />
      <Ink d="M18 16 h56 a10 10 0 0 1 10 10 v24 a10 10 0 0 1 -10 10 h-36 l-13 11 v-11 h-7 a10 10 0 0 1 -10 -10 v-24 a10 10 0 0 1 10 -10 z" />
      <Ink d="M24 32 h40 M24 44 h26" className="ink-faint" />
      <Ink d="M52 70 h48 a10 10 0 0 1 10 10 v16 a10 10 0 0 1 -10 10 h-4 v11 l-13 -11 h-31 a10 10 0 0 1 -10 -10 v-16 a10 10 0 0 1 10 -10 z" />
      <Ink d={`${circle(64, 88, 2.5)} ${circle(76, 88, 2.5)} ${circle(88, 88, 2.5)}`} />
    </svg>
  );
}
