import type { MetadataRoute } from "next";
import { URL_SITUS } from "@/lib/situs";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: "/api/" }],
    sitemap: `${URL_SITUS}/sitemap.xml`,
    host: URL_SITUS,
  };
}
