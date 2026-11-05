/** Briefing sinematik: kamera terbang ke beberapa titik dengan keterangan singkat. */

import type { LayerId } from "./layers";

export interface LangkahTour {
  center: [number, number];
  zoom: number;
  pitch: number;
  bearing: number;
  durasiTerbang: number;
  tahan: number;
  judul: { id: string; en: string };
  teks: { id: string; en: string };
  /** lapisan yang dinyalakan saat langkah ini */
  nyalakan?: LayerId[];
}

export const TOUR: LangkahTour[] = [
  {
    center: [118, -2.5],
    zoom: 3.4,
    pitch: 0,
    bearing: 0,
    durasiTerbang: 2500,
    tahan: 4500,
    judul: { id: "NUSANTARA", en: "THE ARCHIPELAGO" },
    teks: {
      id: "17.000 pulau, 3 alur laut kepulauan, 65 markas TNI, dan 37 pangkalan asing di sekelilingnya.",
      en: "17,000 islands, 3 archipelagic sea lanes, 65 TNI bases, and 37 foreign bases around them.",
    },
    nyalakan: ["tni", "asing", "alki"],
  },
  {
    center: [108.9, 3.9],
    zoom: 6.0,
    pitch: 50,
    bearing: -25,
    durasiTerbang: 4500,
    tahan: 6000,
    judul: { id: "LAUT NATUNA UTARA", en: "NORTH NATUNA SEA" },
    teks: {
      id: "ZEE Indonesia bersinggungan dengan klaim sembilan garis putus. Kapal penjaga pantai China rutin muncul di sini.",
      en: "Indonesia's EEZ meets the nine-dash line claim. Chinese coast guard ships appear here regularly.",
    },
    nyalakan: ["batas", "zee"],
  },
  {
    center: [101.2, 2.4],
    zoom: 6.2,
    pitch: 55,
    bearing: 35,
    durasiTerbang: 4500,
    tahan: 6000,
    judul: { id: "SELAT MALAKA", en: "STRAIT OF MALACCA" },
    teks: {
      id: "Seperempat perdagangan dunia dan hampir semua kabel internet kawasan lewat sini, mendarat di Singapura.",
      en: "A quarter of world trade and nearly every regional internet cable pass through here, landing in Singapore.",
    },
    nyalakan: ["kabel"],
  },
  {
    center: [130.9, -12.4],
    zoom: 6.5,
    pitch: 55,
    bearing: -15,
    durasiTerbang: 5000,
    tahan: 6000,
    judul: { id: "DARWIN", en: "DARWIN" },
    teks: {
      id: "Rotasi Marinir AS setiap tahun sejak 2012, depot bahan bakar, dan rencana pembom B-52. Hanya 800 km dari Kupang.",
      en: "US Marines rotate here every year since 2012, with a fuel depot and planned B-52 bombers. Just 800 km from Kupang.",
    },
    nyalakan: ["asing"],
  },
  {
    center: [144.9, 13.5],
    zoom: 5.5,
    pitch: 45,
    bearing: 20,
    durasiTerbang: 5000,
    tahan: 5500,
    judul: { id: "GUAM", en: "GUAM" },
    teks: {
      id: "Andersen AFB dan Naval Base Guam: ujung tombak AS di Pasifik, 2.900 km dari Jakarta.",
      en: "Andersen AFB and Naval Base Guam: the US spearhead in the Pacific, 2,900 km from Jakarta.",
    },
  },
  {
    center: [118, -2.5],
    zoom: 3.6,
    pitch: 0,
    bearing: 0,
    durasiTerbang: 5000,
    tahan: 4000,
    judul: { id: "MATA GARUDA", en: "EYE OF GARUDA" },
    teks: { id: "Nusantara tidak pernah tidur. Begitu juga sang mata.", en: "The archipelago never sleeps. Neither does the eye." },
    nyalakan: ["tni", "asing", "batas", "alki"],
  },
];
