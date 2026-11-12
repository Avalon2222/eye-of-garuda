import type { NextConfig } from "next";
import { headerKeamanan } from "./src/lib/keamanan";

const nextConfig: NextConfig = {
  agentRules: false,
  cacheComponents: true,
  partialPrefetching: true,
  // asisten membaca GeoJSON ini di server untuk menghitung jarak dan jumlah
  outputFileTracingIncludes: {
    "/api/chat": ["./public/data/*.geojson", "./public/data/insiden.json"],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: headerKeamanan(process.env.NODE_ENV !== "production"),
      },
      {
        source: "/maplibre/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
      },
      {
        source: "/data/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=3600, stale-while-revalidate=86400" }],
      },
    ];
  },
};

export default nextConfig;
