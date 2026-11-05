/**
 * Status tampilan di URL hash agar bisa dibagikan:
 *   #v=lat/lon/zoom/bearing/pitch&l=tni,asing&lang=en&sat=1&2d=1&sel=tni-12
 */

import type { Lang } from "./i18n";
import type { LayerId } from "./layers";

export interface Tampilan {
  lat: number;
  lon: number;
  zoom: number;
  bearing: number;
  pitch: number;
}

export interface StatusUrl {
  tampilan?: Tampilan;
  lapisan?: LayerId[];
  lang?: Lang;
  sat?: boolean;
  datar?: boolean;
  pilih?: string;
}

export const TAMPILAN_AWAL: Tampilan = { lat: -2.5, lon: 118, zoom: 3.6, bearing: 0, pitch: 0 };

export function bacaUrl(): StatusUrl {
  if (typeof window === "undefined") return {};
  const hash = window.location.hash.replace(/^#/, "");
  if (!hash) return {};
  const p = new URLSearchParams(hash);
  const s: StatusUrl = {};
  const v = p.get("v");
  if (v) {
    const [lat, lon, zoom, bearing, pitch] = v.split("/").map(Number);
    if ([lat, lon, zoom].every((x) => Number.isFinite(x))) {
      s.tampilan = { lat, lon, zoom, bearing: bearing || 0, pitch: pitch || 0 };
    }
  }
  const l = p.get("l");
  if (l !== null) s.lapisan = l.split(",").filter(Boolean) as LayerId[];
  const lang = p.get("lang");
  if (lang === "en" || lang === "id") s.lang = lang;
  if (p.get("sat") === "1") s.sat = true;
  if (p.get("2d") === "1") s.datar = true;
  const sel = p.get("sel");
  if (sel) s.pilih = sel;
  return s;
}

export function tulisUrl(s: Required<Omit<StatusUrl, "pilih">> & { pilih?: string }): void {
  if (typeof window === "undefined") return;
  const p = new URLSearchParams();
  const t = s.tampilan;
  p.set("v", [t.lat.toFixed(3), t.lon.toFixed(3), t.zoom.toFixed(2), Math.round(t.bearing), Math.round(t.pitch)].join("/"));
  p.set("l", s.lapisan.join(","));
  if (s.lang !== "id") p.set("lang", s.lang);
  if (s.sat) p.set("sat", "1");
  if (s.datar) p.set("2d", "1");
  if (s.pilih) p.set("sel", s.pilih);
  const baru = "#" + p.toString().replace(/%2F/g, "/").replace(/%2C/g, ",");
  if (window.location.hash !== baru) window.history.replaceState(null, "", baru);
}
