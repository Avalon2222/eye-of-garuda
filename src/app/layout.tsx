import type { Metadata, Viewport } from "next";
import "./globals.css";

const URL_SITUS = "https://eye-of-garuda.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(URL_SITUS),
  title: "Eye of Garuda — konsol pertahanan Indonesia",
  description:
    "The archipelago never sleeps. Neither does the eye. Globe interaktif pertahanan Indonesia: markas TNI, pangkalan asing di kawasan, pulau terluar, ALKI, kabel bawah laut, pesawat militer live, satelit, kapal AIS, ZEE dan sembilan garis putus.",
  keywords: ["Indonesia", "pertahanan", "defense", "OSINT", "globe", "MapLibre", "TNI", "Natuna", "ADS-B", "AIS", "satelit"],
  authors: [{ name: "Avalon2222", url: "https://github.com/Avalon2222" }],
  openGraph: {
    title: "Eye of Garuda",
    description: "The archipelago never sleeps. Neither does the eye.",
    url: URL_SITUS,
    siteName: "Eye of Garuda",
    type: "website",
    locale: "id_ID",
  },
  twitter: { card: "summary_large_image", title: "Eye of Garuda", description: "The archipelago never sleeps. Neither does the eye." },
};

export const viewport: Viewport = {
  themeColor: "#05080f",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" className="h-full">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&display=swap" rel="stylesheet" />
        <link rel="preconnect" href="https://tiles.openfreemap.org" />
      </head>
      <body className="h-full">{children}</body>
    </html>
  );
}
