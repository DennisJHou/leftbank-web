import Link from "next/link";
import { LogoMark } from "@/components/Logo";

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-4 text-center">
      <LogoMark className="h-10 w-10 text-stone" />
      <p className="eyebrow mt-8">404</p>
      <h1 className="display mt-3 text-[36px] md:text-[48px]">這條路，還沒有人走過</h1>
      <p className="mt-4 text-[16px] text-stone">你要找的頁面不存在，或已經被移除了。</p>
      <Link href="/" className="btn btn-stone mt-8">回到首頁</Link>
    </div>
  );
}
