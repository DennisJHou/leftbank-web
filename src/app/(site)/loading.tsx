/** 換頁時立刻顯示的骨架：伺服器還在算新頁面的時候，使用者馬上看到「有在動」，不會覺得按鈕沒反應 */
export default function Loading() {
  return (
    <div className="paper-grid paper-page" role="status" aria-label="載入中">
      <div className="container-page">
        <div className="motion-safe:animate-pulse">
          <div className="h-3 w-24 bg-hairline" />
          <div className="mt-5 h-10 w-56 bg-hairline md:h-12 md:w-80" />
          <div className="mt-6 h-4 w-full max-w-xl bg-hairline" />
          <div className="mt-3 h-4 w-2/3 max-w-md bg-hairline" />
          <div className="mt-16 grid grid-cols-2 gap-x-5 gap-y-10 md:grid-cols-3 md:gap-x-8 lg:grid-cols-4">
            {Array.from({ length: 8 }, (_, i) => (
              <div key={i}>
                <div className="aspect-square bg-hairline" />
                <div className="mt-4 h-4 w-24 bg-hairline" />
                <div className="mt-2 h-3 w-32 bg-hairline" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
