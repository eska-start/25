import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "../jr/index.css";

export const metadata: Metadata = {
  title: "고물 레이서즈 - Junk Racers",
  description: "15초 동안 고물을 모아 나만의 자동차를 만들고, 90초 페인트 배틀에서 가장 넓은 영역을 차지하세요.",
  icons: { icon: "/favicon.svg" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#203e35",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ko">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Jua&family=Noto+Sans+KR:wght@400;500;600;700;800;900&display=swap" />
      </head>
      <body>{children}</body>
    </html>
  );
}
