import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "StoreShot",
  description: "앱스토어와 구글 플레이 미리보기 스크린샷 제작 도구",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
