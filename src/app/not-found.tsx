import Link from "next/link";
import { LogoMark } from "@/components/Logo";

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-5 text-center">
      <LogoMark className="h-10 w-10 text-ink" />
      <h1 className="h-page mt-10">找不到這個頁面</h1>
      <p className="mt-4 text-body text-ash">頁面不存在，或已經被移除。</p>
      <Link href="/" className="btn btn-primary mt-10">回到首頁</Link>
    </div>
  );
}
