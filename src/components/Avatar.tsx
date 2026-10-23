import { initials } from "@/lib/identity";

const TONES = ["bg-[#e4e6d6] text-[#3e4a35]", "bg-[#efe3c8] text-[#6b4d1c]", "bg-[#ecdfd8] text-[#6b443d]", "bg-[#e8e6dc] text-[#4a4741]"];

/** 由字串算出固定的整數，讓同一個人每次拿到同樣的顏色 */
export function hashSeed(seed: string) {
  let h = 0;
  for (const ch of seed) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return h;
}

export function tone(seed: string) {
  return TONES[hashSeed(seed) % TONES.length];
}

/** 有公開照片時顯示照片，否則顯示姓名縮寫（方形，與全站直角風格一致） */
export function Avatar({ name, src, size = 48, className = "" }: { name: string; src?: string | null; size?: number; className?: string }) {
  const style = { width: size, height: size };
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={name} style={style} className={`shrink-0 object-cover ${className}`} />;
  }
  return (
    <span
      style={{ ...style, fontSize: Math.max(14, size * 0.34) }}
      className={`${tone(name)} inline-flex shrink-0 items-center justify-center font-serif ${className}`}
      aria-label={name}
    >
      {initials(name)}
    </span>
  );
}
