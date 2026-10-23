import { hashSeed } from "./Avatar";
import { WASH, Wash, blob } from "./art/sketch";

const CARD_WASHES = [WASH.sage, WASH.ochre, WASH.clay, WASH.river];

/** 沒有照片時的大張圖片位置：方格紙上一塊水彩，姓名直排，像一張名帖。同一個人永遠是同一個顏色與形狀 */
export function NameCard({ name, className = "text-[2.25rem]" }: { name: string; className?: string }) {
  const seed = hashSeed(name);
  return (
    <div className="paper-grid relative flex h-full w-full items-center justify-center" aria-label={name}>
      <svg viewBox="0 0 200 160" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 h-full w-full" aria-hidden>
        <Wash d={blob(104, 82, 52, 50, seed, 0.15)} color={CARD_WASHES[seed % CARD_WASHES.length]} opacity={0.9} />
      </svg>
      <span className={`vertical relative font-serif font-semibold tracking-[0.3em] text-ink-strong ${className}`}>{name}</span>
    </div>
  );
}
