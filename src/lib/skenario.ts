/**
 * Skenario simulasi: cerita bertahap dengan aktor yang bergerak (kapal, pesawat, rudal, kapal selam) di atas peta,
 * narasi, angka jarak/waktu yang dihitung dari koordinat, lalu kesimpulan dan saran.
 *
 * PENTING: semua skenario di sini FIKTIF dan edukatif. Posisi pangkalan dari data publik,
 * tetapi pergerakan, waktu, dan hasilnya hanya ilustrasi untuk memahami geografi, bukan prediksi
 * atau data operasional. Tiap skenario ada di berkas sendiri di src/lib/skenario/.
 */

import type { LayerId } from "./layers";
import { jarakKm } from "./geo";
import { terjemah } from "./i18n";
import { NATUNA } from "./skenario/natuna";
import { KABEL_PUTUS } from "./skenario/kabel";
import { NUKLIR } from "./skenario/nuklir";

export type Pihak = "tni" | "lawan" | "netral";
export type JenisAktor = "kapal" | "pesawat" | "helikopter" | "kapalselam" | "rudal" | "icbm" | "ledakan" | "emp" | "awan" | "kabelputus";

export interface Aktor {
  id: string;
  jenis: JenisAktor;
  pihak: Pihak;
  label: { id: string; en: string };
  /** jalur lon/lat; untuk rudal/icbm cukup [asal, sasaran]; untuk ledakan/emp cukup [pusat] */
  jalur: [number, number][];
  /** mulai bergerak, ms sejak fase dimulai */
  mulai: number;
  /** lama perjalanan, ms (visual, bukan skala waktu nyata) */
  durasi: number;
  /** tetap tampil di posisi akhir setelah selesai */
  tinggal?: boolean;
  /** ledakan/emp/awan: radius akhir dalam km */
  radiusKm?: number;
  /** awan radioaktif: lebar awal dan akhir (km) sepanjang jalur */
  lebarKm?: [number, number];
  /** ledakan: daya dalam kiloton, hanya untuk label */
  kiloton?: number;
}

export interface LingkaranSkenario {
  pusat: [number, number];
  radiusKm: number;
  warna: string;
  label: { id: string; en: string };
}

/** Garis bantu (rute alternatif, jalur pasokan) yang digambar putus-putus bergerak. */
export interface GarisSkenario {
  jalur: [number, number][];
  warna: string;
  label: { id: string; en: string };
  /** ms sejak fase dimulai sebelum garis mulai "ditarik" */
  mulai?: number;
}

export interface AngkaSkenario {
  label: { id: string; en: string };
  /** nilai tetap, atau dihitung dari dua titik (jarak) */
  nilai?: string;
  dari?: [number, number];
  ke?: [number, number];
  /** kecepatan km/jam untuk menghitung waktu tempuh dari jarak */
  kecepatanKmJam?: number;
}

export interface FaseSkenario {
  kode: string;
  judul: { id: string; en: string };
  teks: { id: string; en: string };
  kamera: { center: [number, number]; zoom: number; pitch: number; bearing: number; durasi: number };
  /** lama fase sebelum lanjut otomatis, ms */
  tahan: number;
  aktor: Aktor[];
  lingkaran?: LingkaranSkenario[];
  garis?: GarisSkenario[];
  angka?: AngkaSkenario[];
  /** lapisan tambahan yang dinyalakan khusus di fase ini (di luar `Skenario.lapisan`) */
  nyalakan?: LayerId[];
  /** id kabel bawah laut yang disorot merah (putus) di fase ini */
  kabelPutus?: string[];
}

export interface Skenario {
  id: string;
  ikon: "swords" | "cable" | "radiation";
  warna: string;
  judul: { id: string; en: string };
  sub: { id: string; en: string };
  /** lapisan yang ditampilkan selama simulasi (yang lain disembunyikan, lalu dipulihkan saat selesai) */
  lapisan: LayerId[];
  fase: FaseSkenario[];
  kesimpulan: { id: string[]; en: string[] };
  saran: { id: string[]; en: string[] };
}

export const SKENARIO: Skenario[] = [NATUNA, KABEL_PUTUS, NUKLIR];

/** Lama fase terakhir (kesimpulan) sebelum simulasi menutup sendiri, ms. */
export const TAHAN_KESIMPULAN_MS = 45_000;

export function skenarioDariId(id: string): Skenario | undefined {
  return SKENARIO.find((s) => s.id === id);
}

/** Jarak dan (opsional) waktu tempuh untuk tabel angka. */
export function hitungAngka(a: AngkaSkenario, lang: "id" | "en"): string {
  if (a.nilai) return a.nilai;
  if (!a.dari || !a.ke) return "";
  const km = jarakKm(a.dari[0], a.dari[1], a.ke[0], a.ke[1]);
  let s = `${Math.round(km).toLocaleString("en-US")} km`;
  if (a.kecepatanKmJam) {
    const jam = km / a.kecepatanKmJam;
    if (jam < 1.5) s += ` · ±${Math.round(jam * 60)} ${terjemah(lang, "unit_min")}`;
    else if (jam < 48) s += ` · ±${jam.toFixed(1).replace(/\.0$/, "")} ${terjemah(lang, "unit_hour")}`;
    else s += ` · ±${(jam / 24).toFixed(1).replace(/\.0$/, "")} ${terjemah(lang, "unit_days")}`;
  }
  return s;
}

// ---------- interpolasi jalur (lingkaran besar per segmen) ----------
const RAD = Math.PI / 180;

function slerp(a: [number, number], b: [number, number], f: number): [number, number] {
  const la1 = a[1] * RAD, lo1 = a[0] * RAD, la2 = b[1] * RAD, lo2 = b[0] * RAD;
  const d = 2 * Math.asin(Math.sqrt(Math.sin((la2 - la1) / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin((lo2 - lo1) / 2) ** 2));
  if (d < 1e-9) return [a[0], a[1]];
  const A = Math.sin((1 - f) * d) / Math.sin(d);
  const B = Math.sin(f * d) / Math.sin(d);
  const x = A * Math.cos(la1) * Math.cos(lo1) + B * Math.cos(la2) * Math.cos(lo2);
  const y = A * Math.cos(la1) * Math.sin(lo1) + B * Math.cos(la2) * Math.sin(lo2);
  const z = A * Math.sin(la1) + B * Math.sin(la2);
  return [Math.atan2(y, x) / RAD, Math.atan2(z, Math.sqrt(x * x + y * y)) / RAD];
}

/** Posisi dan haluan pada fraksi f (0..1) sepanjang jalur multi-segmen, berbobot jarak. */
export function posisiJalur(jalur: [number, number][], f: number): { lon: number; lat: number; haluan: number } {
  if (jalur.length === 1) return { lon: jalur[0][0], lat: jalur[0][1], haluan: 0 };
  const seg: number[] = [];
  let total = 0;
  for (let i = 1; i < jalur.length; i++) {
    const d = jarakKm(jalur[i - 1][0], jalur[i - 1][1], jalur[i][0], jalur[i][1]);
    seg.push(d);
    total += d;
  }
  if (total < 1e-6) return { lon: jalur[0][0], lat: jalur[0][1], haluan: 0 };
  let sisa = Math.min(1, Math.max(0, f)) * total;
  for (let i = 0; i < seg.length; i++) {
    if (sisa <= seg[i] || i === seg.length - 1) {
      const fs = seg[i] > 0 ? Math.min(1, sisa / seg[i]) : 1;
      const p = slerp(jalur[i], jalur[i + 1], fs);
      const q = slerp(jalur[i], jalur[i + 1], Math.min(1, fs + 0.02));
      const haluan = haluanDeg(p, q);
      return { lon: p[0], lat: p[1], haluan };
    }
    sisa -= seg[i];
  }
  const akhir = jalur[jalur.length - 1];
  return { lon: akhir[0], lat: akhir[1], haluan: 0 };
}

export function haluanDeg(a: [number, number], b: [number, number]): number {
  const la1 = a[1] * RAD, la2 = b[1] * RAD, dlo = (b[0] - a[0]) * RAD;
  const y = Math.sin(dlo) * Math.cos(la2);
  const x = Math.cos(la1) * Math.sin(la2) - Math.sin(la1) * Math.cos(la2) * Math.cos(dlo);
  return ((Math.atan2(y, x) / RAD) + 360) % 360;
}

/** Titik-titik jalur yang sudah dilalui sampai fraksi f (untuk jejak). */
export function jejakJalur(jalur: [number, number][], f: number, n = 40): [number, number][] {
  const hasil: [number, number][] = [];
  for (let i = 0; i <= n; i++) {
    const p = posisiJalur(jalur, (f * i) / n);
    hasil.push([p.lon, p.lat]);
  }
  return hasil;
}

/** Teks ringkas skenario untuk ekspor (Markdown). */
export function skenarioKeMarkdown(s: Skenario, lang: "id" | "en"): string {
  const b: string[] = [`# ${s.judul[lang]}`, "", s.sub[lang], ""];
  s.fase.forEach((f, i) => {
    b.push(`## ${i + 1}. ${f.judul[lang]}`, "", f.teks[lang], "");
    if (f.angka?.length) {
      for (const a of f.angka) b.push(`- ${a.label[lang]}: ${hitungAngka(a, lang)}`);
      b.push("");
    }
  });
  b.push(`## ${terjemah(lang, "md_conclusions")}`, "");
  s.kesimpulan[lang].forEach((k, i) => b.push(`${i + 1}. ${k}`));
  b.push("", `## ${terjemah(lang, "md_recommendations")}`, "");
  s.saran[lang].forEach((k, i) => b.push(`${i + 1}. ${k}`));
  b.push("", terjemah(lang, "md_footer"));
  return b.join("\n");
}
