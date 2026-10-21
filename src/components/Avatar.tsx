import { initials } from "@/lib/identity";

const TONES = ["bg-[#e4e6d6] text-[#3e4a35]", "bg-[#efe3c8] text-[#6b4d1c]", "bg-[#ecdfd8] text-[#6b443d]", "bg-[#e8e6dc] text-[#4a4741]"];

export function tone(seed: string) {
  let h = 0;
  for (const ch of seed) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return TONES[h % TONES.length];
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

/** 沒有照片時的大張圖片位置：整塊染上柔和的大地色，中央放姓名縮寫 */
export function InitialsPanel({ name, className = "" }: { name: string; className?: string }) {
  return (
    <div className={`flex h-full w-full items-center justify-center ${tone(name)} ${className}`} aria-label={name}>
      <span className="font-serif text-page tracking-[0.06em]">{initials(name)}</span>
    </div>
  );
}
