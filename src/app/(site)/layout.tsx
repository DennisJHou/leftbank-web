import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:bg-ink focus:px-5 focus:py-3 focus:text-meta focus:text-white"
      >
        跳到主要內容
      </a>
      <Nav />
      <main id="main" tabIndex={-1} className="paper-grid paper-page outline-none">
        {children}
      </main>
      <Footer />
    </>
  );
}
