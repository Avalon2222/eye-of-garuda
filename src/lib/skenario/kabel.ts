/**
 * Skenario 2: Cable Cut di Selat Singapura (fiktif, edukatif).
 * Hampir semua kabel internet internasional Indonesia lewat Singapura/Batam. Apa yang terjadi kalau
 * beberapa kabel putus sekaligus, misalnya karena jangkar kapal yang diseret di alur sempit?
 * Pola seperti ini pernah terjadi di tempat lain (Matsu 2023, Laut Baltik 2024, Laut Merah 2024).
 */

import type { Skenario } from "../skenario";

// ---------- titik acuan (lon, lat) dari data publik ----------
const BATAM: [number, number] = [104.03, 1.12]; // landing station Batam (Nongsa / Batam Centre)
const SELAT_1: [number, number] = [104.1, 1.24]; // alur timur Selat Singapura, koridor kabel
const SELAT_2: [number, number] = [104.3, 1.2];
const SELAT_3: [number, number] = [104.5, 1.17];
const JAKARTA: [number, number] = [106.85, -6.15];
const MANADO: [number, number] = [124.85, 1.5]; // landing SEA-US
const DAVAO: [number, number] = [125.6, 7.07];
const KUPANG: [number, number] = [123.6, -10.17];
const DARWIN: [number, number] = [130.84, -12.46];
const KAPAL_REPARASI: [number, number] = [103.75, 1.27]; // depot kapal kabel di Singapura/Batam

export const KABEL_PUTUS: Skenario = {
  id: "kabel",
  ikon: "cable",
  warna: "#22d3ee",
  judul: { id: "CABLE CUT: SELAT SINGAPURA", en: "CABLE CUT: SINGAPORE STRAIT" },
  sub: {
    id: "Simulasi fiktif: jangkar kapal memutus beberapa kabel internet sekaligus di alur tersibuk kawasan. Apa dampaknya ke Indonesia, dan berapa lama pulih?",
    en: "Fictional simulation: a dragged anchor severs several internet cables at once in the region's busiest lane. What happens to Indonesia, and how long until it recovers?",
  },
  lapisan: ["kabel", "pelabuhan", "alki", "tni"],
  fase: [
    {
      kode: "F1",
      judul: { id: "CHOKE POINT DIGITAL", en: "THE DIGITAL CHOKE POINT" },
      teks: {
        id: "Batam dan Singapura adalah pintu internet Indonesia ke dunia: lebih dari 20 kabel internasional mendarat di Batam, dan sebagian besar lalu lintas ke Eropa, Timur Tengah, dan Amerika lewat sini. Semua kabel itu lewat alur sempit yang dilalui ±1.000 kapal per hari.",
        en: "Batam and Singapore are Indonesia's internet gateway to the world: over 20 international cables land in Batam, and most traffic to Europe, the Middle East and the Americas passes here. All of them cross a narrow lane used by ±1,000 ships a day.",
      },
      kamera: { center: [104.2, 1.2], zoom: 8.2, pitch: 50, bearing: -15, durasi: 3500 },
      tahan: 15000,
      aktor: [
        { id: "kargo", jenis: "kapal", pihak: "netral", label: { id: "Kapal kargo (fiktif)", en: "Cargo ship (fictional)" }, jalur: [[104.75, 1.12], SELAT_3], mulai: 1500, durasi: 11000, tinggal: true },
        { id: "tanker", jenis: "kapal", pihak: "netral", label: { id: "Tanker", en: "Tanker" }, jalur: [[103.6, 1.2], [104.0, 1.21]], mulai: 500, durasi: 12000, tinggal: true },
      ],
      angka: [
        { label: { id: "Kabel internasional mendarat di Batam", en: "International cables landing in Batam" }, nilai: "22" },
        { label: { id: "Kapal melintasi Selat Singapura per hari", en: "Ships through the Singapore Strait per day" }, nilai: "±1.000" },
        { label: { id: "Batam → Jakarta (kabel domestik)", en: "Batam → Jakarta (domestic cable)" }, dari: BATAM, ke: JAKARTA },
      ],
    },
    {
      kode: "F2",
      judul: { id: "JANGKAR DISERET", en: "THE DRAGGED ANCHOR" },
      teks: {
        id: "Cuaca buruk, kapal kargo kehilangan posisi dan menyeret jangkar sejauh beberapa kilometer di koridor kabel. Dalam 40 menit, tiga sistem kabel besar putus. Pola ini nyata: Matsu 2023, Laut Baltik 2024, dan Laut Merah 2024 semuanya diawali jangkar atau kapal yang hanyut.",
        en: "In bad weather a cargo ship loses position and drags its anchor several kilometres across the cable corridor. Within 40 minutes three major cable systems are cut. The pattern is real: Matsu 2023, the Baltic 2024 and the Red Sea 2024 all began with an anchor or a drifting ship.",
      },
      kamera: { center: [104.3, 1.2], zoom: 8.6, pitch: 55, bearing: 10, durasi: 3000 },
      tahan: 16000,
      kabelPutus: ["kabel-seamewe-5", "kabel-indigo-west", "kabel-asia-america-gateway-aag-cable-system"],
      aktor: [
        { id: "kargo", jenis: "kapal", pihak: "netral", label: { id: "Kapal kargo menyeret jangkar", en: "Cargo ship dragging anchor" }, jalur: [SELAT_3, SELAT_2, SELAT_1], mulai: 500, durasi: 9000, tinggal: true },
        { id: "putus1", jenis: "kabelputus", pihak: "lawan", label: { id: "SEA-ME-WE 5 putus", en: "SEA-ME-WE 5 cut" }, jalur: [SELAT_2], mulai: 4200, durasi: 1200, tinggal: true },
        { id: "putus2", jenis: "kabelputus", pihak: "lawan", label: { id: "INDIGO-West putus", en: "INDIGO-West cut" }, jalur: [[104.2, 1.22]], mulai: 6400, durasi: 1200, tinggal: true },
        { id: "putus3", jenis: "kabelputus", pihak: "lawan", label: { id: "AAG putus", en: "AAG cut" }, jalur: [SELAT_1], mulai: 8600, durasi: 1200, tinggal: true },
      ],
      angka: [
        { label: { id: "Kabel putus (fiktif)", en: "Cables cut (fictional)" }, nilai: "3" },
        { label: { id: "Jangkar diseret", en: "Anchor dragged" }, dari: SELAT_3, ke: SELAT_1 },
        { label: { id: "Kedalaman alur", en: "Lane depth" }, nilai: "20–40 m" },
      ],
    },
    {
      kode: "F3",
      judul: { id: "INTERNET MELAMBAT, BUKAN PADAM", en: "THE INTERNET SLOWS, NOT DIES" },
      teks: {
        id: "Jakarta tidak gelap total: lalu lintas dialihkan ke kabel yang masih utuh di Batam, dan ke jalur timur lewat Manado (SEA-US) dan Jakarta–Davao (Bifrost, Echo) menuju Amerika. Tetapi kapasitas turun, latensi ke Eropa naik dari ±170 ms menjadi 250 ms lebih, dan harga transit melonjak. Perbankan, cloud, dan game online merasakannya dalam hitungan menit.",
        en: "Jakarta does not go dark: traffic reroutes to the surviving Batam cables and to the eastern routes via Manado (SEA-US) and Jakarta–Davao (Bifrost, Echo) toward the Americas. But capacity drops, latency to Europe climbs from ±170 ms to 250 ms or more, and transit prices spike. Banking, cloud and online games feel it within minutes.",
      },
      kamera: { center: [112, -1], zoom: 4.6, pitch: 40, bearing: 0, durasi: 3500 },
      tahan: 17000,
      kabelPutus: ["kabel-seamewe-5", "kabel-indigo-west", "kabel-asia-america-gateway-aag-cable-system"],
      garis: [
        { jalur: [JAKARTA, [116, -4], [122, -1], MANADO], warna: "#4ade80", label: { id: "Alih ke timur: SEA-US via Manado", en: "Reroute east: SEA-US via Manado" }, mulai: 1500 },
        { jalur: [JAKARTA, [112, -6.5], [120, -2], DAVAO], warna: "#4ade80", label: { id: "Bifrost / Echo → Davao → AS", en: "Bifrost / Echo → Davao → US" }, mulai: 3500 },
        { jalur: [JAKARTA, [110, -7.5], KUPANG, DARWIN], warna: "#fbbf24", label: { id: "Cadangan selatan → Australia", en: "Southern backup → Australia" }, mulai: 5500 },
      ],
      aktor: [],
      angka: [
        { label: { id: "Latensi Jakarta → Eropa (sebelum)", en: "Jakarta → Europe latency (before)" }, nilai: "±170 ms" },
        { label: { id: "Latensi via jalur alternatif", en: "Latency via alternate routes" }, nilai: "250–320 ms" },
        { label: { id: "Jakarta → Manado (SEA-US)", en: "Jakarta → Manado (SEA-US)" }, dari: JAKARTA, ke: MANADO },
      ],
    },
    {
      kode: "F4",
      judul: { id: "KAPAL REPARASI & IZIN", en: "REPAIR SHIPS & PERMITS" },
      teks: {
        id: "Hanya segelintir kapal reparasi kabel yang berbasis di kawasan ini. Satu kapal butuh beberapa hari untuk tiba, lalu tiap sambungan memakan 1–3 hari di laut. Di luar itu, waktu paling lama sering habis untuk izin: di perairan Indonesia, perbaikan kabel bisa menunggu berminggu-minggu karena perizinan lintas kementerian. Total pemulihan 2–6 minggu.",
        en: "Only a handful of cable repair ships are based in this region. One needs days to arrive, then each splice takes 1–3 days at sea. Beyond that, the longest wait is often permits: in Indonesian waters a repair can sit for weeks waiting on cross-ministry approvals. Total recovery 2–6 weeks.",
      },
      kamera: { center: [104.1, 1.2], zoom: 8.0, pitch: 45, bearing: -10, durasi: 3500 },
      tahan: 15000,
      kabelPutus: ["kabel-seamewe-5", "kabel-indigo-west", "kabel-asia-america-gateway-aag-cable-system"],
      aktor: [
        { id: "reparasi", jenis: "kapal", pihak: "tni", label: { id: "Kapal reparasi kabel", en: "Cable repair ship" }, jalur: [KAPAL_REPARASI, [103.95, 1.2], SELAT_1], mulai: 1000, durasi: 8000, tinggal: true },
        { id: "putus1", jenis: "kabelputus", pihak: "lawan", label: { id: "SEA-ME-WE 5", en: "SEA-ME-WE 5" }, jalur: [SELAT_2], mulai: 0, durasi: 1, tinggal: true },
        { id: "putus2", jenis: "kabelputus", pihak: "lawan", label: { id: "INDIGO-West", en: "INDIGO-West" }, jalur: [[104.2, 1.22]], mulai: 0, durasi: 1, tinggal: true },
        { id: "putus3", jenis: "kabelputus", pihak: "lawan", label: { id: "AAG", en: "AAG" }, jalur: [SELAT_1], mulai: 0, durasi: 1, tinggal: true },
        { id: "kri", jenis: "kapal", pihak: "tni", label: { id: "KRI pengaman area", en: "KRI securing the area" }, jalur: [[104.03, 1.05], [104.25, 1.15]], mulai: 2500, durasi: 7000, tinggal: true },
      ],
      angka: [
        { label: { id: "Depot kapal kabel → titik putus", en: "Cable ship depot → cut site" }, dari: KAPAL_REPARASI, ke: SELAT_1, kecepatanKmJam: 22 },
        { label: { id: "Waktu sambung per kabel", en: "Splice time per cable" }, nilai: "1–3 hari" },
        { label: { id: "Waktu izin (perairan Indonesia)", en: "Permit time (Indonesian waters)" }, nilai: "1–4 minggu" },
      ],
    },
    {
      kode: "F5",
      judul: { id: "KESIMPULAN & SARAN", en: "CONCLUSIONS & RECOMMENDATIONS" },
      teks: {
        id: "Rangkuman skenario dan pelajarannya untuk ketahanan digital Indonesia. Pendapat edukatif dari data publik, bukan kajian resmi.",
        en: "Summary of the scenario and its lessons for Indonesia's digital resilience. An educational take on public data, not an official assessment.",
      },
      kamera: { center: [110, -1], zoom: 4.8, pitch: 35, bearing: 0, durasi: 3000 },
      tahan: 45000,
      aktor: [],
    },
  ],
  kesimpulan: {
    id: [
      "Internet internasional Indonesia bertumpu pada satu titik sempit: Batam–Singapura. Tiga kabel putus tidak memadamkan internet, tetapi langsung menurunkan kapasitas dan menaikkan latensi serta harga.",
      "Penyebab paling umum bukan sabotase, melainkan jangkar dan alat tangkap: lebih dari dua pertiga gangguan kabel dunia berasal dari aktivitas kapal.",
      "Jalur timur (Manado, Davao) dan selatan (Kupang, Darwin) adalah asuransi yang nyata, tetapi kapasitasnya masih jauh lebih kecil dari jalur Singapura.",
      "Pemulihan diukur dalam minggu, dan sebagian besar waktu habis bukan di laut, melainkan di meja perizinan.",
    ],
    en: [
      "Indonesia's international internet leans on one narrow point: Batam–Singapore. Three cuts do not kill the internet, but they immediately cut capacity and raise latency and prices.",
      "The most common cause is not sabotage but anchors and fishing gear: more than two thirds of cable faults worldwide come from ship activity.",
      "Eastern (Manado, Davao) and southern (Kupang, Darwin) routes are real insurance, but their capacity is still far below the Singapore route.",
      "Recovery is measured in weeks, and most of that time is spent not at sea but at the permit desk.",
    ],
  },
  saran: {
    id: [
      "Diversifikasi landing: dorong kabel baru yang mendarat langsung di Jakarta, Manado, atau Kupang tanpa lewat Singapura.",
      "Satu pintu perizinan perbaikan kabel (one-stop) dengan target hari, bukan minggu, plus kapal reparasi yang siaga di kawasan.",
      "Zona lindung kabel di Selat Singapura dan Natuna: larangan buang jangkar, pemantauan AIS otomatis, dan sanksi yang tegas.",
      "Latihan bersama operator, Kominfo, TNI AL, dan Bakamla untuk skenario multi-putus, termasuk prioritas lalu lintas untuk layanan kritis.",
    ],
    en: [
      "Diversify landings: encourage new cables landing directly in Jakarta, Manado or Kupang without passing Singapore.",
      "A one-stop cable repair permit measured in days, not weeks, plus a repair ship on standby in the region.",
      "Cable protection zones in the Singapore Strait and Natuna: no-anchoring rules, automated AIS monitoring and real penalties.",
      "Joint drills with operators, the communications ministry, the navy and the coast guard for multi-cut scenarios, including traffic priority for critical services.",
    ],
  },
};
