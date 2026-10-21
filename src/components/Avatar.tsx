import { initials } from "@/lib/identity";

const TONES = ["bg-sage-pale text-forest", "bg-gold-pale text-gold-deep", "bg-[#e8d5cf] text-clay", "bg-surface-grey text-stone"];

export function tone(seed: string) {
  let h = 0;
  for (const ch of seed) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return TONES[h % TONES.length];
}

/** 有公開照片時顯示照片，否則顯示姓名縮寫 */
export function Avatar({
  name,
  src,
  size = 48,
  className = "",
  rounded = "rounded-full",
}: {
  name: string;
  src?: string | null;
  size?: number;
  className?: string;
  rounded?: string;
}) {
  const style = { width: size, height: size };
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={name} style={style} className={`${rounded} object-cover ${className}`} />;
  }
  return (
    <span
      style={{ ...style, fontSize: Math.max(12, size * 0.32) }}
      className={`${rounded} ${tone(name)} inline-flex shrink-0 items-center justify-center font-serif ${className}`}
      aria-label={name}
    >
      {initials(name)}
    </span>
  );
}

/** 沒有照片時的大張卡片底：整張染上柔和的大地色，中央放姓名縮寫 */
export function InitialsPanel({ name, className = "" }: { name: string; className?: string }) {
  return (
    <div className={`flex h-full w-full items-center justify-center ${tone(name)} ${className}`} aria-label={name}>
      <span className="font-serif text-[44px] font-light tracking-[0.06em] md:text-[52px]">{initials(name)}</span>
    </div>
  );
}
