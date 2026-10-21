"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Avatar } from "./Avatar";
import { logout } from "@/app/actions/auth";

const LINKS = [
  { href: "/#about", label: "關於計畫" },
  { href: "/alumni", label: "系友園地" },
  { href: "/compass", label: "職涯羅盤" },
];

export function NavLinks({ vertical = false, onNavigate }: { vertical?: boolean; onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <ul className={vertical ? "flex flex-col" : "flex items-center gap-7"}>
      {LINKS.map((l) => {
        const active = l.href !== "/#about" && pathname.startsWith(l.href);
        return (
          <li key={l.href}>
            <Link
              href={l.href}
              onClick={onNavigate}
              aria-current={active ? "page" : undefined}
              className={
                vertical
                  ? "block border-b border-hairline py-4 font-serif text-2xl font-light text-ink"
                  : `text-[15px] text-ink transition-colors hover:text-stone ${active ? "underline decoration-silver underline-offset-8" : ""}`
              }
            >
              {l.label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

function useClickOutside(ref: React.RefObject<HTMLElement | null>, onOutside: () => void) {
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onOutside();
    };
    const esc = (e: KeyboardEvent) => e.key === "Escape" && onOutside();
    document.addEventListener("mousedown", handler);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", handler);
      document.removeEventListener("keydown", esc);
    };
  }, [ref, onOutside]);
}

export function UserMenu({ user }: { user: { name: string; photo: string | null } }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  useClickOutside(ref, () => setOpen(false));
  useEffect(() => setOpen(false), [pathname]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="帳號選單"
        className="flex h-11 w-11 items-center justify-center rounded-full"
      >
        <Avatar name={user.name} src={user.photo} size={38} />
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 top-[52px] w-52 overflow-hidden rounded-[20px] border border-hairline bg-surface py-2 shadow-[var(--shadow-float)]"
        >
          <p className="truncate px-5 pb-2 pt-1 text-[13px] text-ash">{user.name}</p>
          <Link role="menuitem" href="/me" className="block px-5 py-2.5 text-[15px] hover:bg-canvas">
            我的帳號
          </Link>
          <Link role="menuitem" href="/me/story" className="block px-5 py-2.5 text-[15px] hover:bg-canvas">
            留下你的故事
          </Link>
          <form action={logout}>
            <button role="menuitem" className="block w-full px-5 py-2.5 text-left text-[15px] text-stone hover:bg-canvas">
              登出
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

export function MobileMenu() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <div className="md:hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label={open ? "關閉選單" : "開啟選單"}
        className="flex h-11 w-11 items-center justify-center rounded-full text-stone"
      >
        <svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
          {open ? (
            <path d="M5 5l12 12M17 5L5 17" strokeLinecap="round" />
          ) : (
            <path d="M3 7h16M3 15h16" strokeLinecap="round" />
          )}
        </svg>
      </button>
      {/* 用 portal 掛到 body：header 的 backdrop-filter 會讓 fixed 定位失效 */}
      {open &&
        createPortal(
          <div className="fixed inset-x-0 bottom-0 top-16 z-30 bg-canvas px-4 pt-2 md:hidden">
            <NavLinks vertical onNavigate={() => setOpen(false)} />
          </div>,
          document.body,
        )}
    </div>
  );
}
