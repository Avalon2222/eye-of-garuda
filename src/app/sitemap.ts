import type { MetadataRoute } from "next";
import { URL_SITUS } from "@/lib/situs";

// situsnya satu halaman; semua tampilan lain disimpan di hash URL (#v=...), jadi cukup satu entri
export default function sitemap(): MetadataRoute.Sitemap {
  return [{ url: URL_SITUS, changeFrequency: "weekly", priority: 1 }];
}
