"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function AdminNav({ items }: { items: { href: string; label: string }[] }) {
  const pathname = usePathname();
  return (
    <nav aria-label="後台導覽" className="snap-row -mx-4 flex gap-1 overflow-x-auto px-4 md:mx-0 md:flex-col md:px-0">
      {items.map((it) => {
        const active = it.href === "/admin" ? pathname === "/admin" : pathname.startsWith(it.href);
        return (
          <Link
            key={it.href}
            href={it.href}
            aria-current={active ? "page" : undefined}
            className={`whitespace-nowrap rounded-[10px] px-3 py-2 text-[14px] transition-colors ${
              active ? "bg-stone text-white" : "text-stone hover:bg-surface"
            }`}
          >
            {it.label}
          </Link>
        );
      })}
    </nav>
  );
}
