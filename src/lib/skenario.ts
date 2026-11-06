/**
 * Skenario simulasi: cerita bertahap dengan aktor yang bergerak (kapal, pesawat, rudal) di atas peta,
 * narasi, angka jarak/waktu yang dihitung dari koordinat, lalu kesimpulan dan saran.
 *
 * PENTING: semua skenario di sini FIKTIF dan edukatif. Posisi pangkalan dari data publik,
 * tetapi pergerakan, waktu, dan hasilnya hanya ilustrasi untuk memahami geografi, bukan prediksi
 * atau data operasional.
 */

import type { LayerId } from "./layers";
import { jarakKm } from "./geo";

export type Pihak = "tni" | "lawan" | "netral";
export type JenisAktor = "kapal" | "pesawat" | "rudal" | "ledakan";

export interface Aktor {
  id: string;
  jenis: JenisAktor;
  pihak: Pihak;
  label: { id: string; en: string };
  /** jalur lon/lat; untuk rudal cukup [asal, sasaran] */
  jalur: [number, number][];
  /** mulai bergerak, ms sejak fase dimulai */
  mulai: number;
  /** lama perjalanan, ms (visual, bukan skala waktu nyata) */
  durasi: number;
  /** tetap tampil di posisi akhir setelah selesai */
  tinggal?: boolean;
}

export interface LingkaranSkenario {
  pusat: [number, number];
  radiusKm: number;
  warna: string;
  label: { id: string; en: string };
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
  angka?: AngkaSkenario[];
  nyalakan?: LayerId[];
}

export interface Skenario {
  id: string;
  judul: { id: string; en: string };
  sub: { id: string; en: string };
  fase: FaseSkenario[];
  kesimpulan: { id: string[]; en: string[] };
  saran: { id: string[]; en: string[] };
}

// ---------- titik acuan (lon, lat) dari data publik ----------
const RANAI: [number, number] = [108.388, 3.909]; // Lanud Raden Sadjad / Lanal Ranai
const LANAL_RANAI: [number, number] = [108.38, 3.95];
const PEKANBARU: [number, number] = [101.4448, 0.4608]; // Lanud Roesmin Nurjadin (F-16)
const SUPADIO: [number, number] = [109.4039, -0.1507]; // Lanud Supadio (Hawk 209)
const BATAM: [number, number] = [104.0305, 1.0456]; // Lantamal IV
const FIERY_CROSS: [number, number] = [112.89, 9.55];
const SUBI: [number, number] = [114.08, 10.92];
const KONTAK: [number, number] = [109.8, 5.2]; // area tumpang tindih klaim di Laut Natuna Utara
const KONTAK_2: [number, number] = [110.15, 5.05];
const LAUT_UTARA: [number, number] = [111.9, 7.4];
const LAUT_UTARA_2: [number, number] = [112.4, 7.1];

export const SKENARIO: Skenario[] = [
  {
    id: "natuna",
    judul: { id: "KRISIS LAUT NATUNA UTARA", en: "NORTH NATUNA SEA CRISIS" },
    sub: {
      id: "Simulasi fiktif: kapal asing masuk ZEE, TNI merespons, eskalasi hipotetis. Untuk memahami geografi, bukan prediksi.",
      en: "Fictional simulation: foreign ships enter the EEZ, TNI responds, hypothetical escalation. To understand geography, not a prediction.",
    },
    fase: [
      {
        kode: "F1",
        judul: { id: "KONTAK DI ZEE", en: "CONTACT IN THE EEZ" },
        teks: {
          id: "Pukul 03:00 Zulu (fiktif): kapal survei asing dikawal kapal penjaga pantai masuk ke area tumpang tindih klaim di Laut Natuna Utara, 180 km dari Ranai. Satelit pengintai dan AIS mendeteksi lebih dulu; radar pantai menyusul.",
          en: "03:00 Zulu (fictional): a foreign survey ship escorted by a coast guard cutter enters the overlapping-claim area in the North Natuna Sea, 180 km from Ranai. Reconnaissance satellites and AIS detect it first; coastal radar follows.",
        },
        kamera: { center: [109.6, 4.9], zoom: 5.6, pitch: 45, bearing: -20, durasi: 3500 },
        tahan: 15000,
        nyalakan: ["tni", "asing", "zee", "batas"],
        aktor: [
          { id: "survei", jenis: "kapal", pihak: "lawan", label: { id: "Kapal survei (fiktif)", en: "Survey ship (fictional)" }, jalur: [LAUT_UTARA, KONTAK], mulai: 1500, durasi: 11000, tinggal: true },
          { id: "cg", jenis: "kapal", pihak: "lawan", label: { id: "Penjaga pantai (fiktif)", en: "Coast guard (fictional)" }, jalur: [LAUT_UTARA_2, KONTAK_2], mulai: 2500, durasi: 11000, tinggal: true },
        ],
        angka: [
          { label: { id: "Kontak → Ranai", en: "Contact → Ranai" }, dari: KONTAK, ke: RANAI },
          { label: { id: "Kontak → Fiery Cross Reef", en: "Contact → Fiery Cross Reef" }, dari: KONTAK, ke: FIERY_CROSS },
        ],
      },
      {
        kode: "F2",
        judul: { id: "RESPONS TNI", en: "TNI RESPONSE" },
        teks: {
          id: "KRI dari Lanal Ranai bergerak lebih dulu (3 jam). Kapal dari Lantamal IV Batam butuh ±14 jam. F-16 dari Lanud Roesmin Nurjadin, Pekanbaru, tiba dalam ±55 menit; Hawk dari Supadio ±40 menit. Jarak adalah musuh pertama.",
          en: "A KRI from Ranai naval base moves first (3 hours). Ships from Batam need ±14 hours. F-16s from Roesmin Nurjadin AFB, Pekanbaru, arrive in ±55 minutes; Hawks from Supadio in ±40. Distance is the first enemy.",
        },
        kamera: { center: [107.0, 3.4], zoom: 5.0, pitch: 50, bearing: 10, durasi: 3500 },
        tahan: 17000,
        nyalakan: ["radius"],
        aktor: [
          { id: "survei", jenis: "kapal", pihak: "lawan", label: { id: "Kapal survei", en: "Survey ship" }, jalur: [KONTAK, KONTAK], mulai: 0, durasi: 1, tinggal: true },
          { id: "cg", jenis: "kapal", pihak: "lawan", label: { id: "Penjaga pantai", en: "Coast guard" }, jalur: [KONTAK_2, KONTAK_2], mulai: 0, durasi: 1, tinggal: true },
          { id: "kri1", jenis: "kapal", pihak: "tni", label: { id: "KRI dari Ranai", en: "KRI from Ranai" }, jalur: [LANAL_RANAI, [109.55, 5.0]], mulai: 1000, durasi: 9000, tinggal: true },
          { id: "kri2", jenis: "kapal", pihak: "tni", label: { id: "KRI dari Batam (±14 jam)", en: "KRI from Batam (±14 h)" }, jalur: [BATAM, [106.6, 3.0], [109.4, 4.8]], mulai: 1000, durasi: 15000, tinggal: true },
          { id: "f16", jenis: "pesawat", pihak: "tni", label: { id: "F-16 Pekanbaru", en: "F-16 Pekanbaru" }, jalur: [PEKANBARU, [105.5, 3.0], [109.5, 5.1]], mulai: 2000, durasi: 7500, tinggal: true },
          { id: "hawk", jenis: "pesawat", pihak: "tni", label: { id: "Hawk 209 Supadio", en: "Hawk 209 Supadio" }, jalur: [SUPADIO, [109.9, 4.9]], mulai: 3500, durasi: 6000, tinggal: true },
        ],
        angka: [
          { label: { id: "Pekanbaru → kontak (F-16, 900 km/j)", en: "Pekanbaru → contact (F-16, 900 km/h)" }, dari: PEKANBARU, ke: KONTAK, kecepatanKmJam: 900 },
          { label: { id: "Supadio → kontak (Hawk, 850 km/j)", en: "Supadio → contact (Hawk, 850 km/h)" }, dari: SUPADIO, ke: KONTAK, kecepatanKmJam: 850 },
          { label: { id: "Batam → kontak (KRI, 20 knot)", en: "Batam → contact (KRI, 20 kt)" }, dari: BATAM, ke: KONTAK, kecepatanKmJam: 37 },
          { label: { id: "Ranai → kontak (KRI, 20 knot)", en: "Ranai → contact (KRI, 20 kt)" }, dari: LANAL_RANAI, ke: KONTAK, kecepatanKmJam: 37 },
        ],
      },
      {
        kode: "F3",
        judul: { id: "ESKALASI HIPOTETIS", en: "HYPOTHETICAL ESCALATION" },
        teks: {
          id: "Andai eskalasi terjadi: pos pulau buatan di Spratly berjarak ±500 km dari area kontak, masih di dalam jangkauan rudal anti-kapal pesisir modern (±500-550 km). Peluncuran fiktif menunjukkan geometri ancaman, bukan kejadian nyata. Kapal yang berada di dalam lingkaran merah hanya punya belasan menit untuk bereaksi.",
          en: "If escalation happened: artificial-island outposts in the Spratlys sit ±500 km from the contact area, inside the reach of modern coastal anti-ship missiles (±500-550 km). The fictional launches show threat geometry, not real events. Ships inside the red circle have only minutes to react.",
        },
        kamera: { center: [111.2, 6.8], zoom: 4.9, pitch: 55, bearing: -35, durasi: 3500 },
        tahan: 18000,
        aktor: [
          { id: "survei", jenis: "kapal", pihak: "lawan", label: { id: "Kapal survei", en: "Survey ship" }, jalur: [KONTAK, KONTAK], mulai: 0, durasi: 1, tinggal: true },
          { id: "kri1", jenis: "kapal", pihak: "tni", label: { id: "KRI", en: "KRI" }, jalur: [[109.55, 5.0], [109.55, 5.0]], mulai: 0, durasi: 1, tinggal: true },
          { id: "f16", jenis: "pesawat", pihak: "tni", label: { id: "F-16", en: "F-16" }, jalur: [[109.5, 5.1], [110.3, 5.9], [109.2, 5.6], [109.5, 5.1]], mulai: 0, durasi: 16000, tinggal: true },
          { id: "r1", jenis: "rudal", pihak: "lawan", label: { id: "Rudal anti-kapal (fiktif)", en: "Anti-ship missile (fictional)" }, jalur: [FIERY_CROSS, [110.3, 5.6]], mulai: 3000, durasi: 5000 },
          { id: "r2", jenis: "rudal", pihak: "lawan", label: { id: "Rudal anti-kapal (fiktif)", en: "Anti-ship missile (fictional)" }, jalur: [SUBI, [110.6, 5.9]], mulai: 4500, durasi: 5600 },
          { id: "r3", jenis: "rudal", pihak: "lawan", label: { id: "Rudal anti-kapal (fiktif)", en: "Anti-ship missile (fictional)" }, jalur: [FIERY_CROSS, [109.9, 5.9]], mulai: 9000, durasi: 5000 },
          { id: "balas", jenis: "rudal", pihak: "tni", label: { id: "Rudal KRI (fiktif)", en: "KRI missile (fictional)" }, jalur: [[109.55, 5.0], KONTAK_2], mulai: 11500, durasi: 2600 },
        ],
        lingkaran: [
          { pusat: FIERY_CROSS, radiusKm: 540, warna: "#ef4444", label: { id: "Jangkauan rudal pesisir ±540 km (ilustrasi)", en: "Coastal missile reach ±540 km (illustrative)" } },
        ],
        angka: [
          { label: { id: "Fiery Cross → kontak (rudal subsonik 1.000 km/j)", en: "Fiery Cross → contact (subsonic missile 1,000 km/h)" }, dari: FIERY_CROSS, ke: KONTAK, kecepatanKmJam: 1000 },
          { label: { id: "Subi Reef → kontak", en: "Subi Reef → contact" }, dari: SUBI, ke: KONTAK, kecepatanKmJam: 1000 },
        ],
      },
      {
        kode: "F4",
        judul: { id: "GEOMETRI JARAK", en: "THE GEOMETRY OF DISTANCE" },
        teks: {
          id: "Dari atas terlihat masalahnya: Natuna lebih dekat ke pos lawan daripada ke pangkalan tempur utama TNI. Pangkalan depan di Ranai memangkas waktu respons dari jam menjadi menit, dan kesadaran domain maritim (satelit, radar, AIS) memberi waktu untuk memutuskan.",
          en: "From above the problem is clear: Natuna is closer to the opposing outposts than to TNI's main combat bases. A forward base at Ranai cuts response time from hours to minutes, and maritime domain awareness (satellites, radar, AIS) buys time to decide.",
        },
        kamera: { center: [108.5, 4.5], zoom: 4.2, pitch: 35, bearing: 0, durasi: 3500 },
        tahan: 16000,
        aktor: [],
        lingkaran: [
          { pusat: RANAI, radiusKm: 400, warna: "#4ade80", label: { id: "Ranai: 400 km (±25 menit F-16)", en: "Ranai: 400 km (±25 min F-16)" } },
          { pusat: FIERY_CROSS, radiusKm: 540, warna: "#ef4444", label: { id: "Fiery Cross: ±540 km", en: "Fiery Cross: ±540 km" } },
        ],
        angka: [
          { label: { id: "Ranai → Fiery Cross", en: "Ranai → Fiery Cross" }, dari: RANAI, ke: FIERY_CROSS },
          { label: { id: "Ranai → Pekanbaru", en: "Ranai → Pekanbaru" }, dari: RANAI, ke: PEKANBARU },
          { label: { id: "Ranai → Batam", en: "Ranai → Batam" }, dari: RANAI, ke: BATAM },
          { label: { id: "Ranai → Jakarta (Halim)", en: "Ranai → Jakarta (Halim)" }, dari: RANAI, ke: [106.891, -6.2665] },
        ],
      },
      {
        kode: "F5",
        judul: { id: "KESIMPULAN & SARAN", en: "CONCLUSIONS & RECOMMENDATIONS" },
        teks: {
          id: "Rangkuman skenario dan pelajaran geografisnya. Ini pendapat edukatif dari data publik, bukan kajian resmi.",
          en: "Summary of the scenario and its geographic lessons. An educational take built on public data, not an official assessment.",
        },
        kamera: { center: [109.0, 4.0], zoom: 4.6, pitch: 40, bearing: -10, durasi: 3000 },
        tahan: 60000,
        aktor: [],
      },
    ],
    kesimpulan: {
      id: [
        "Area tumpang tindih klaim berjarak ±180 km dari Ranai tetapi 600-750 km dari pangkalan tempur utama di Pekanbaru dan Batam.",
        "Pos pulau buatan di Spratly berada ±500 km dari area kontak: di dalam jangkauan rudal anti-kapal pesisir, tetapi di luar jangkauan sebagian besar pesawat tempur TNI tanpa isi ulang udara.",
        "Kapal perang butuh belasan jam dari Batam; pesawat butuh ±1 jam dari Pekanbaru. Yang ada lebih dulu di lokasi menentukan narasi.",
        "Deteksi dini (satelit, AIS, radar pantai) adalah pengganda kekuatan paling murah: tiap jam peringatan mengubah respons dari reaktif menjadi terencana.",
      ],
      en: [
        "The overlapping-claim area is ±180 km from Ranai but 600-750 km from the main combat bases at Pekanbaru and Batam.",
        "Artificial-island outposts in the Spratlys are ±500 km from the contact area: inside coastal anti-ship missile reach, but beyond most TNI fighters' reach without aerial refuelling.",
        "Warships need over a dozen hours from Batam; jets need ±1 hour from Pekanbaru. Whoever is on scene first owns the narrative.",
        "Early detection (satellites, AIS, coastal radar) is the cheapest force multiplier: every hour of warning turns a reaction into a plan.",
      ],
    },
    saran: {
      id: [
        "Perkuat Ranai sebagai pangkalan depan: landasan, hanggar, bahan bakar, dan detasemen tempur yang menetap, bukan hanya rotasi.",
        "Kesadaran domain maritim 24 jam: gabungkan satelit (SAR + optik), radar pantai, AIS, dan patroli udara maritim menjadi satu gambaran operasi.",
        "Latihan respons gabungan AL-AU dengan patokan waktu, plus kerja sama dengan tetangga (Malaysia, Vietnam, Singapura) untuk berbagi data kapal.",
        "Jalur diplomasi tetap dibuka sejak kontak pertama; tujuan operasi adalah menunjukkan kehadiran dan hukum, bukan memulai baku tembak.",
      ],
      en: [
        "Strengthen Ranai as a forward base: runway, hangars, fuel and a resident combat detachment, not just rotations.",
        "24-hour maritime domain awareness: fuse satellites (SAR + optical), coastal radar, AIS and maritime patrol aircraft into one operating picture.",
        "Joint navy-air force response drills against time benchmarks, plus data sharing with neighbours (Malaysia, Vietnam, Singapore).",
        "Keep the diplomatic channel open from first contact; the operation's goal is presence and law, not starting an exchange of fire.",
      ],
    },
  },
];

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
    if (jam < 1.5) s += ` · ±${Math.round(jam * 60)} ${lang === "id" ? "menit" : "min"}`;
    else s += ` · ±${jam.toFixed(1).replace(/\.0$/, "")} ${lang === "id" ? "jam" : "h"}`;
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
