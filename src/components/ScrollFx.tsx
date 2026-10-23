"use client";

import { useEffect } from "react";

/**
 * 捲動效果（不用套件），放在頁面任一處即可：
 * - [data-reveal]：捲進畫面時加上 data-shown，交給 CSS 做浮現、畫線、蓋章
 * - [data-progress]：捲動時把位置寫進 --p（0 → 1），交給 CSS 做視差與指針旋轉
 *   預設是「從畫面下緣進來，到上緣離開」；data-progress="exit" 是「從頁面頂端，到整塊捲出畫面」
 * 之後才出現的元素（例如系友園地換篩選條件後的新卡片）也會自動接上。
 * 使用者關掉動態效果時，CSS 不會藏任何東西（見 globals.css 的 prefers-reduced-motion），這裡也就不必做事。
 */
export function ScrollFx() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          e.target.setAttribute("data-shown", "");
          io.unobserve(e.target);
        }
      },
      { rootMargin: "0px 0px -10% 0px" },
    );

    let tracked: HTMLElement[] = [];
    let frame = 0;
    const update = () => {
      frame = 0;
      const vh = window.innerHeight;
      for (const el of tracked) {
        const rect = el.getBoundingClientRect();
        const p = el.dataset.progress === "exit" ? -rect.top / rect.height : (vh - rect.top) / (vh + rect.height);
        el.style.setProperty("--p", Math.min(1, Math.max(0, p)).toFixed(4));
      }
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    const scan = () => {
      document.querySelectorAll("[data-reveal]:not([data-shown])").forEach((el) => io.observe(el));
      tracked = Array.from(document.querySelectorAll<HTMLElement>("[data-progress]"));
      schedule();
    };

    scan();
    let pending = 0;
    const mo = new MutationObserver(() => {
      if (!pending) pending = requestAnimationFrame(() => ((pending = 0), scan()));
    });
    mo.observe(document.body, { childList: true, subtree: true });
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      io.disconnect();
      mo.disconnect();
      cancelAnimationFrame(frame);
      cancelAnimationFrame(pending);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
    };
  }, []);

  return null;
}
