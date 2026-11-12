import type { Metadata, Viewport } from "next";
import { JetBrains_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { URL_SITUS } from "@/lib/situs";
import "./globals.css";

// font di-host sendiri lewat next/font: tanpa request ke Google saat runtime, tanpa lompatan tata letak
const fontMono = JetBrains_Mono({ subsets: ["latin"], weight: ["400", "500", "600", "700"], display: "swap", variable: "--font-jetbrains" });

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
  // sengaja tanpa maximumScale: halaman boleh di-pinch-zoom (aksesibilitas); peta tetap menangani pinch-nya sendiri
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" className={`h-full ${fontMono.variable}`}>
      <head>
        <link rel="preconnect" href="https://tiles.openfreemap.org" />
      </head>
      <body className="h-full">
        {children}
        {/* Vercel Web Analytics: tanpa cookie, skripnya dari domain sendiri (/_vercel/insights).
            Cuma dipasang di build Vercel; di lokal/CI jalur itu tidak ada. */}
        {process.env.VERCEL ? <Analytics /> : null}
      </body>
    </html>
  );
}
