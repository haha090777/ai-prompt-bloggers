import type { Metadata } from "next";
import { Noto_Sans_SC, Syne } from "next/font/google";
import "./globals.css";

const noto = Noto_Sans_SC({
  subsets: ["latin"],
  weight: ["400", "500", "700", "900"],
  variable: "--font-noto",
  display: "swap",
  preload: false,
});

const syne = Syne({
  subsets: ["latin"],
  weight: ["600", "700", "800"],
  variable: "--font-syne",
  display: "swap",
});

export const metadata: Metadata = {
  title: "AI 提示词博主合集 · 提示词星图",
  description:
    "浏览并筛选在 X 上分享 AI 提示词的创作者。按海报、视频、UI、长视频与代码分类，可用 TypeSafe Jev 自动建议标签。",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN" className={`${noto.variable} ${syne.variable}`}>
      <body>{children}</body>
    </html>
  );
}
