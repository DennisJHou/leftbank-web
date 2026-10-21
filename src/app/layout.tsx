import type { Metadata, Viewport } from "next";
import { Newsreader, Noto_Sans_TC, Noto_Serif_TC } from "next/font/google";
import "./globals.css";

const newsreader = Newsreader({
  subsets: ["latin"],
  weight: ["300", "400"],
  style: ["normal", "italic"],
  variable: "--font-newsreader",
  display: "swap",
});
const notoSerif = Noto_Serif_TC({
  weight: ["300", "400", "500"],
  variable: "--font-noto-serif-tc",
  display: "swap",
  preload: false,
});
const notoSans = Noto_Sans_TC({
  weight: ["400", "500", "700"],
  variable: "--font-noto-sans-tc",
  display: "swap",
  preload: false,
});

export const metadata: Metadata = {
  title: { default: "左岸計畫｜臺大心理系", template: "%s｜左岸計畫" },
  description: "串起系友 × 學生 × 系上：看見系友的學思歷程、低門檻地向系友提問或約一杯咖啡，並用職涯羅盤找到自己卡在哪裡。",
};

export const viewport: Viewport = {
  themeColor: "#f7f1e8",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="zh-Hant"
      data-scroll-behavior="smooth"
      className={`${newsreader.variable} ${notoSerif.variable} ${notoSans.variable}`}
    >
      <body className="min-h-dvh">{children}</body>
    </html>
  );
}
