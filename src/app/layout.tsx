import type { Metadata } from "next";
import "./globals.css";

const defaultSiteUrl = "https://get-launch-done.vercel.app";

function resolveSiteUrl() {
  const configuredUrl =
    [
      process.env.NEXT_PUBLIC_SITE_URL,
      process.env.SITE_URL,
      process.env.VERCEL_PROJECT_PRODUCTION_URL,
      process.env.VERCEL_URL,
      defaultSiteUrl,
    ].find((url): url is string => Boolean(url?.trim())) ?? defaultSiteUrl;

  const normalizedUrl = configuredUrl.trim();
  const urlWithProtocol = /^https?:\/\//.test(normalizedUrl)
    ? normalizedUrl
    : `https://${normalizedUrl}`;

  return new URL(urlWithProtocol);
}

const siteUrl = resolveSiteUrl();

export const metadata: Metadata = {
  metadataBase: siteUrl,
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
