import type { Metadata } from "next";
import "./globals.css";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "StoreShot",
  description: "앱스토어와 구글 플레이 미리보기 스크린샷 제작 도구",
  openGraph: {
    title: "StoreShot",
    description: "앱스토어와 구글 플레이 미리보기 스크린샷 제작 도구",
    siteName: "StoreShot",
    type: "website",
  },
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
