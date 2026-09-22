import type { Metadata } from "next";
import { Inter, Noto_Sans_SC } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-inter",
  display: "swap",
});

const noto = Noto_Sans_SC({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-noto",
  display: "swap",
  preload: false,
});

export const metadata: Metadata = {
  title: "AI 提示词博主合集 · 提示词星图",
  description:
    "在一堆 X 头像里搜索 AI 提示词博主。输入自然语言或点标签，对上的人会从堆里浮上来。",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN" className={`${inter.variable} ${noto.variable}`}>
      <body>{children}</body>
    </html>
  );
}
