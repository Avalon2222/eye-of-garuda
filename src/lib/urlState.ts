/**
 * Status tampilan di URL hash agar bisa dibagikan:
 *   #v=lat/lon/zoom/bearing/pitch&l=tni,asing&lang=en&sat=1&2d=1&sel=tni-12
 */

import type { Lang } from "./i18n";
import { LAPISAN, type LayerId } from "./layers";

const ID_LAPISAN = new Set<string>(LAPISAN.map((l) => l.id));

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

/**
 * Tampilan awal yang pas dengan layar: Indonesia (95°–141° BT, ±46°) selebar layar.
 * Di desktop tetap zoom 3.6; di HP zoom diturunkan supaya Sabang sampai Merauke kelihatan semua.
 */
export function tampilanAwal(lebar: number = typeof window === "undefined" ? 1440 : window.innerWidth): Tampilan {
  // innerWidth 0 (iframe tersembunyi, tab latar belakang) membuat log2(0) = -Infinity, dan MapLibre menolak
  // zoom tak hingga. Lebar yang tidak masuk akal memakai zoom bawaan; zoom tidak pernah di bawah 0.
  if (!Number.isFinite(lebar) || lebar <= 0) return { ...TAMPILAN_AWAL };
  const zoomPas = Math.log2((lebar * 0.96 * 360) / 46 / 512);
  return { ...TAMPILAN_AWAL, zoom: Math.max(0, Math.min(TAMPILAN_AWAL.zoom, Math.round(zoomPas * 100) / 100)) };
}

function jepit(x: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, x));
}

/** Bearing ke rentang -180..180; Infinity atau NaN dari link ketik tangan jadi 0 (utara). */
function normalBearing(b: number): number {
  if (!Number.isFinite(b)) return 0;
  const n = ((((b + 180) % 360) + 360) % 360) - 180;
  return n === -180 ? 180 : n;
}

export function bacaUrl(): StatusUrl {
  if (typeof window === "undefined") return {};
  return uraiHash(window.location.hash);
}

/** Urai isi hash (dengan atau tanpa "#") jadi StatusUrl. Terpisah dari `window` supaya bisa dites. */
export function uraiHash(hashMentah: string): StatusUrl {
  const hash = hashMentah.replace(/^#/, "");
  if (!hash) return {};
  const p = new URLSearchParams(hash);
  const s: StatusUrl = {};
  const v = p.get("v");
  if (v) {
    // Number("") bernilai 0, jadi "v=-6//5" diam-diam terbaca bujur 0. Bagian kosong dianggap tidak valid.
    const [lat, lon, zoom, bearing, pitch] = v.split("/").map((x) => (x.trim() === "" ? NaN : Number(x)));
    // Link yang diketik tangan bisa berisi lat 200 atau zoom 99; MapLibre melempar error untuk lat di
    // luar ±90, jadi tampilan seperti itu diabaikan dan zoom/pitch dijepit ke rentang peta.
    if ([lat, lon, zoom].every((x) => Number.isFinite(x)) && Math.abs(lat) <= 90 && Math.abs(lon) <= 180) {
      s.tampilan = {
        lat,
        lon,
        zoom: jepit(zoom, 0, 22),
        bearing: normalBearing(bearing),
        pitch: jepit(pitch || 0, 0, 85),
      };
    }
  }
  const l = p.get("l");
  // "tni, asing" (spasi setelah koma) dan "tni,tni" dari link yang diedit tangan tetap terbaca rapi.
  // Id yang tidak dikenal (salah ketik atau lapisan lama yang sudah dihapus) dibuang, supaya tidak
  // ikut tersimpan di status lapisan aktif lalu ditulis ulang ke URL terus-menerus.
  if (l !== null) s.lapisan = [...new Set(l.split(",").map((x) => x.trim()).filter((x) => ID_LAPISAN.has(x)))] as LayerId[];
  // "lang=EN" atau "lang=en " dari link ketik tangan tetap dikenali.
  const lang = p.get("lang")?.trim().toLowerCase();
  if (lang === "en" || lang === "id") s.lang = lang;
  // "sat=1 " (spasi ikut tersalin) tetap dibaca seperti lang dan sel.
  if (p.get("sat")?.trim() === "1") s.sat = true;
  if (p.get("2d")?.trim() === "1") s.datar = true;
  // "sel=tni-12 " dari link yang disalin bersama spasi tetap memilih objek yang sama.
  const sel = p.get("sel")?.trim();
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
