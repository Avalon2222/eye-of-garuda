/**
 * Skenario 3: Perang nuklir di kawasan (fiktif, edukatif).
 * Indonesia bukan sasaran, tetapi berada di bawah bayang-bayangnya: EMP ketinggian tinggi, satelit yang mati,
 * awan radioaktif yang terbawa muson, dan rantai pasok pangan serta BBM yang terputus.
 * Pihak sengaja tidak disebut; sasaran memakai lokasi nyata hanya untuk menunjukkan geometri jarak.
 * Radius efek memakai angka publik orde besar (ledakan ±300 kt), bukan perhitungan teknis.
 */

import type { Skenario } from "../skenario";

// ---------- titik acuan (lon, lat) ----------
const GUAM: [number, number] = [144.93, 13.58]; // Andersen AFB
const HAINAN: [number, number] = [109.69, 18.21]; // pangkalan kapal selam Yulin
const LAUT_FILIPINA: [number, number] = [133.0, 16.0]; // gugus tugas kapal induk (fiktif)
const HEMP: [number, number] = [113.0, 11.0]; // ledakan ketinggian tinggi di atas Laut China Selatan
const SSBN_A: [number, number] = [150.0, 24.0]; // posisi peluncuran kapal selam (fiktif)
const SSBN_B: [number, number] = [116.5, 14.5];
const NATUNA: [number, number] = [108.39, 3.95];
const JAKARTA: [number, number] = [106.85, -6.15];
const PONTIANAK: [number, number] = [109.33, -0.03];
const MANADO: [number, number] = [124.85, 1.5];
const SINGAPURA: [number, number] = [103.85, 1.29];
const SURABAYA: [number, number] = [112.75, -7.25];
const MAKASSAR: [number, number] = [119.41, -5.13];

export const NUKLIR: Skenario = {
  id: "nuklir",
  ikon: "radiation",
  warna: "#fbbf24",
  judul: { id: "NUCLEAR WAR: BAYANGAN DI ATAS NUSANTARA", en: "NUCLEAR WAR: THE SHADOW OVER THE ARCHIPELAGO" },
  sub: {
    id: "Simulasi fiktif: dua blok bertukar serangan nuklir terbatas di kawasan. Tidak satu pun bom jatuh di Indonesia, tetapi EMP, satelit, fallout, dan rantai pasok tetap menghantam. Untuk memahami geografi, bukan prediksi.",
    en: "Fictional simulation: two blocs trade a limited nuclear exchange in the region. No bomb falls on Indonesia, yet EMP, satellites, fallout and supply chains are all hit. To understand geography, not a prediction.",
  },
  lapisan: ["asing", "kapalselam", "batas", "alki"],
  fase: [
    {
      kode: "F1",
      judul: { id: "PELUNCURAN", en: "LAUNCH" },
      teks: {
        id: "Krisis di Laut China Selatan lepas kendali. Dua pihak (sengaja tidak disebut) meluncurkan rudal balistik dari kapal selam: satu ke pangkalan udara di Guam, satu ke pangkalan kapal selam di Hainan, satu ke gugus kapal induk di Laut Filipina, dan satu ledakan ketinggian tinggi di atas Laut China Selatan untuk melumpuhkan elektronik. Waktu terbang: 10–20 menit.",
        en: "A South China Sea crisis spins out of control. Two sides (deliberately unnamed) launch submarine-based ballistic missiles: one at an air base on Guam, one at a submarine base on Hainan, one at a carrier group in the Philippine Sea, and one high-altitude burst over the South China Sea to cripple electronics. Flight time: 10–20 minutes.",
      },
      kamera: { center: [126, 10], zoom: 3.6, pitch: 45, bearing: -10, durasi: 4000 },
      tahan: 17000,
      aktor: [
        { id: "ssbnA", jenis: "kapalselam", pihak: "lawan", label: { id: "Kapal selam rudal balistik (A)", en: "Ballistic missile submarine (A)" }, jalur: [SSBN_A, [149.5, 23.5]], mulai: 500, durasi: 14000, tinggal: true },
        { id: "ssbnB", jenis: "kapalselam", pihak: "lawan", label: { id: "Kapal selam rudal balistik (B)", en: "Ballistic missile submarine (B)" }, jalur: [SSBN_B, [116.2, 14.2]], mulai: 500, durasi: 14000, tinggal: true },
        { id: "i1", jenis: "icbm", pihak: "lawan", label: { id: "SLBM → Hainan (fiktif)", en: "SLBM → Hainan (fictional)" }, jalur: [SSBN_A, HAINAN], mulai: 3000, durasi: 7000 },
        { id: "i2", jenis: "icbm", pihak: "lawan", label: { id: "SLBM → Guam (fiktif)", en: "SLBM → Guam (fictional)" }, jalur: [SSBN_B, GUAM], mulai: 4500, durasi: 7000 },
        { id: "i3", jenis: "icbm", pihak: "lawan", label: { id: "SLBM → gugus kapal induk", en: "SLBM → carrier group" }, jalur: [SSBN_B, LAUT_FILIPINA], mulai: 6000, durasi: 6000 },
        { id: "i4", jenis: "icbm", pihak: "lawan", label: { id: "Ledakan ketinggian tinggi (HEMP)", en: "High-altitude burst (HEMP)" }, jalur: [SSBN_A, HEMP], mulai: 7500, durasi: 6500 },
      ],
      angka: [
        { label: { id: "Jakarta → ledakan terdekat (HEMP)", en: "Jakarta → nearest burst (HEMP)" }, dari: JAKARTA, ke: HEMP },
        { label: { id: "Natuna → HEMP", en: "Natuna → HEMP" }, dari: NATUNA, ke: HEMP },
        { label: { id: "Waktu terbang SLBM", en: "SLBM flight time" }, nilai: "10–20 menit" },
      ],
    },
    {
      kode: "F2",
      judul: { id: "DETONASI", en: "DETONATION" },
      teks: {
        id: "Tiga ledakan permukaan ±300 kiloton (20 kali Hiroshima): bola api ±1 km, bangunan runtuh dalam radius ±5 km, luka bakar parah hingga ±10 km. Di peta kawasan, lingkarannya tampak kecil. Yang besar justru ledakan keempat: di ketinggian 400 km, tanpa bola api di darat, tetapi denyut elektromagnetiknya menjangkau lebih dari 2.000 km.",
        en: "Three ±300-kiloton surface bursts (20 times Hiroshima): a ±1 km fireball, buildings collapse within ±5 km, severe burns out to ±10 km. On a regional map those circles look small. The big one is the fourth: at 400 km altitude, no fireball on the ground, but an electromagnetic pulse reaching more than 2,000 km.",
      },
      kamera: { center: [122, 12], zoom: 3.9, pitch: 50, bearing: 5, durasi: 3500 },
      tahan: 18000,
      aktor: [
        { id: "l1", jenis: "ledakan", pihak: "lawan", label: { id: "Hainan ±300 kt", en: "Hainan ±300 kt" }, jalur: [HAINAN], mulai: 1000, durasi: 4000, tinggal: true, radiusKm: 10, kiloton: 300 },
        { id: "l2", jenis: "ledakan", pihak: "lawan", label: { id: "Guam ±300 kt", en: "Guam ±300 kt" }, jalur: [GUAM], mulai: 2500, durasi: 4000, tinggal: true, radiusKm: 10, kiloton: 300 },
        { id: "l3", jenis: "ledakan", pihak: "lawan", label: { id: "Laut Filipina ±300 kt", en: "Philippine Sea ±300 kt" }, jalur: [LAUT_FILIPINA], mulai: 4000, durasi: 4000, tinggal: true, radiusKm: 10, kiloton: 300 },
        { id: "emp", jenis: "emp", pihak: "lawan", label: { id: "HEMP 400 km: jangkauan ±2.200 km", en: "HEMP at 400 km: ±2,200 km footprint" }, jalur: [HEMP], mulai: 6500, durasi: 6000, tinggal: true, radiusKm: 2200 },
      ],
      angka: [
        { label: { id: "Bola api (300 kt)", en: "Fireball (300 kt)" }, nilai: "±1 km" },
        { label: { id: "Bangunan runtuh (5 psi)", en: "Buildings collapse (5 psi)" }, nilai: "±5 km" },
        { label: { id: "Luka bakar derajat 3", en: "Third-degree burns" }, nilai: "±10 km" },
        { label: { id: "Jangkauan EMP dari 400 km", en: "EMP footprint from 400 km" }, nilai: "±2.200 km" },
      ],
    },
    {
      kode: "F3",
      judul: { id: "EMP & SATELIT: INDONESIA IKUT KENA", en: "EMP & SATELLITES: INDONESIA IS HIT TOO" },
      teks: {
        id: "Lingkaran EMP menutupi Natuna, Kalimantan Barat, Sumatra bagian utara, dan Singapura. Trafo, menara seluler, dan elektronik yang tidak terlindung di area itu berisiko rusak seketika; pemadaman bisa berlangsung berminggu-minggu karena trafo besar dibuat berbulan-bulan. Di orbit rendah, sabuk radiasi buatan merusak satelit selama berbulan-bulan: GPS tetap hidup (di MEO), tetapi satelit pengamatan dan komunikasi LEO berguguran.",
        en: "The EMP footprint covers Natuna, West Kalimantan, northern Sumatra and Singapore. Transformers, cell towers and unshielded electronics there risk instant damage; blackouts can last weeks because large transformers take months to build. In low orbit an artificial radiation belt degrades satellites for months: GPS survives (in MEO), but LEO observation and communication satellites fail one by one.",
      },
      kamera: { center: [110, 4], zoom: 4.2, pitch: 40, bearing: 0, durasi: 3500 },
      tahan: 18000,
      nyalakan: ["satelit", "tni"],
      aktor: [
        { id: "emp", jenis: "emp", pihak: "lawan", label: { id: "Jangkauan EMP ±2.200 km", en: "EMP footprint ±2,200 km" }, jalur: [HEMP], mulai: 0, durasi: 1, tinggal: true, radiusKm: 2200 },
      ],
      lingkaran: [
        { pusat: HEMP, radiusKm: 1200, warna: "#fde68a", label: { id: "Zona medan kuat (ilustrasi)", en: "Strong-field zone (illustrative)" } },
      ],
      angka: [
        { label: { id: "HEMP → Natuna", en: "HEMP → Natuna" }, dari: HEMP, ke: NATUNA },
        { label: { id: "HEMP → Pontianak", en: "HEMP → Pontianak" }, dari: HEMP, ke: PONTIANAK },
        { label: { id: "HEMP → Singapura", en: "HEMP → Singapore" }, dari: HEMP, ke: SINGAPURA },
        { label: { id: "HEMP → Jakarta", en: "HEMP → Jakarta" }, dari: HEMP, ke: JAKARTA },
        { label: { id: "Waktu ganti trafo besar", en: "Large transformer lead time" }, nilai: "6–18 bulan" },
      ],
    },
    {
      kode: "F4",
      judul: { id: "FALLOUT MENGIKUTI MUSON", en: "FALLOUT RIDES THE MONSOON" },
      teks: {
        id: "Ledakan permukaan mengangkat debu radioaktif. Pada muson timur laut (November–Maret), angin membawa awan dari Hainan ke barat daya: Vietnam selatan, lalu Laut Natuna dalam 2–3 hari, dengan dosis yang terus turun. Dari Guam, awan bergerak ke barat menuju Filipina. Indonesia tidak menerima fallout mematikan, tetapi hujan radioaktif ringan, ikan terkontaminasi, dan kepanikan pasar adalah risiko nyata.",
        en: "Surface bursts loft radioactive dust. In the northeast monsoon (November–March) winds carry the Hainan plume south-west: southern Vietnam, then the Natuna Sea within 2–3 days, with dose falling as it spreads. From Guam the plume drifts west toward the Philippines. Indonesia receives no lethal fallout, but light radioactive rain, contaminated fish and market panic are real risks.",
      },
      kamera: { center: [115, 9], zoom: 4.0, pitch: 45, bearing: -5, durasi: 3500 },
      tahan: 18000,
      aktor: [
        { id: "awan1", jenis: "awan", pihak: "lawan", label: { id: "Awan radioaktif dari Hainan", en: "Radioactive plume from Hainan" }, jalur: [HAINAN, [107.5, 14.5], [106.5, 10.5], [107.5, 6.5], [108.4, 4.2]], mulai: 500, durasi: 13000, tinggal: true, lebarKm: [40, 420] },
        { id: "awan2", jenis: "awan", pihak: "lawan", label: { id: "Awan radioaktif dari Guam", en: "Radioactive plume from Guam" }, jalur: [GUAM, [138, 13.5], [130, 12.5], [124.5, 12]], mulai: 2000, durasi: 12000, tinggal: true, lebarKm: [40, 380] },
        { id: "l1", jenis: "ledakan", pihak: "lawan", label: { id: "Hainan", en: "Hainan" }, jalur: [HAINAN], mulai: 0, durasi: 1, tinggal: true, radiusKm: 10 },
        { id: "l2", jenis: "ledakan", pihak: "lawan", label: { id: "Guam", en: "Guam" }, jalur: [GUAM], mulai: 0, durasi: 1, tinggal: true, radiusKm: 10 },
      ],
      angka: [
        { label: { id: "Hainan → Natuna (angin 25 km/j)", en: "Hainan → Natuna (25 km/h wind)" }, dari: HAINAN, ke: NATUNA, kecepatanKmJam: 25 },
        { label: { id: "Guam → Manado", en: "Guam → Manado" }, dari: GUAM, ke: MANADO, kecepatanKmJam: 25 },
        { label: { id: "Musim angin", en: "Wind season" }, nilai: "Muson timur laut (Nov–Mar)" },
      ],
    },
    {
      kode: "F5",
      judul: { id: "PANGAN, BBM, DAN KAPAL YANG BERHENTI", en: "FOOD, FUEL AND SHIPS THAT STOP" },
      teks: {
        id: "Kapal asuransi tidak menanggung perairan yang terkontaminasi: lalu lintas Laut China Selatan dan pelabuhan Singapura berhenti. Indonesia mengimpor hampir semua gandumnya, sebagian beras dari Thailand dan Vietnam, dan sebagian besar BBM olahan lewat Singapura dan Malaysia. Stok nasional BBM hanya ±20 hari. Dalam dua minggu, antrean SPBU dan lonjakan harga pangan terasa di Jawa.",
        en: "Insurers will not cover contaminated waters: South China Sea traffic and the port of Singapore stop. Indonesia imports nearly all its wheat, part of its rice from Thailand and Vietnam, and most refined fuel through Singapore and Malaysia. National fuel stocks last ±20 days. Within two weeks, fuel queues and food price spikes reach Java.",
      },
      kamera: { center: [110, -2], zoom: 4.3, pitch: 35, bearing: 0, durasi: 3500 },
      tahan: 18000,
      nyalakan: ["pelabuhan", "kapal"],
      garis: [
        { jalur: [[100.5, 13.5], [102.0, 6.0], SINGAPURA], warna: "#f87171", label: { id: "Beras Thailand/Vietnam: terhenti", en: "Thai/Vietnamese rice: halted" }, mulai: 1000 },
        { jalur: [SINGAPURA, [105.5, -3.5], JAKARTA], warna: "#f87171", label: { id: "BBM olahan via Singapura: terhenti", en: "Refined fuel via Singapore: halted" }, mulai: 2500 },
        { jalur: [[131, -12.5], [122, -8.5], SURABAYA], warna: "#4ade80", label: { id: "Gandum Australia via selatan: masih jalan", en: "Australian wheat via the south: still moving" }, mulai: 4000 },
        { jalur: [[140.5, -9], [128, -5], MAKASSAR], warna: "#4ade80", label: { id: "Jalur timur: masih jalan", en: "Eastern route: still moving" }, mulai: 5500 },
      ],
      aktor: [],
      angka: [
        { label: { id: "Stok BBM nasional", en: "National fuel stock" }, nilai: "±20 hari" },
        { label: { id: "Gandum: impor", en: "Wheat: imported" }, nilai: "±100%" },
        { label: { id: "Singapura → Jakarta (tanker, 12 knot)", en: "Singapore → Jakarta (tanker, 12 kt)" }, dari: SINGAPURA, ke: JAKARTA, kecepatanKmJam: 22 },
      ],
    },
    {
      kode: "F6",
      judul: { id: "KESIMPULAN & SARAN", en: "CONCLUSIONS & RECOMMENDATIONS" },
      teks: {
        id: "Rangkuman skenario dan pelajarannya untuk Indonesia yang tidak ikut berperang tetapi tetap terkena. Pendapat edukatif dari data publik, bukan kajian resmi.",
        en: "Summary of the scenario and its lessons for an Indonesia that is not at war yet still gets hit. An educational take on public data, not an official assessment.",
      },
      kamera: { center: [115, 0], zoom: 3.8, pitch: 30, bearing: 0, durasi: 3000 },
      tahan: 45000,
      aktor: [],
    },
  ],
  kesimpulan: {
    id: [
      "Tanpa satu bom pun jatuh di Indonesia, satu ledakan ketinggian tinggi di Laut China Selatan sudah cukup untuk mematikan listrik dan komunikasi di Natuna, Kalimantan Barat, dan Sumatra utara.",
      "Ancaman terbesar bagi Indonesia bukan ledakannya, melainkan efek lanjutan: satelit LEO yang mati, fallout ringan yang terbawa muson, dan rantai pasok BBM serta pangan yang berhenti dalam hitungan hari.",
      "Ketergantungan pada Singapura untuk BBM olahan dan pada impor gandum membuat guncangan di utara langsung terasa di Jawa.",
      "Jarak masih melindungi: fallout mematikan tidak sampai, dan jalur selatan serta timur tetap terbuka. Geografi kepulauan adalah aset kalau direncanakan.",
    ],
    en: [
      "Without a single bomb falling on Indonesia, one high-altitude burst over the South China Sea is enough to knock out power and communications in Natuna, West Kalimantan and northern Sumatra.",
      "Indonesia's biggest threat is not the blast but the aftermath: dead LEO satellites, light fallout carried by the monsoon, and fuel and food supply chains that stop within days.",
      "Dependence on Singapore for refined fuel and on imported wheat means a shock in the north is felt in Java immediately.",
      "Distance still protects: lethal fallout does not arrive, and the southern and eastern routes stay open. Archipelagic geography is an asset if it is planned for.",
    ],
  },
  saran: {
    id: [
      "Perkuat jaringan listrik: trafo cadangan, pemisahan jaringan (islanding) untuk Natuna, Kalbar, dan Sumut, serta pelindung EMP untuk fasilitas vital.",
      "Cadangan BBM dan pangan strategis minimal 60 hari, dengan jalur pasok selatan (Australia) dan timur sebagai cadangan resmi.",
      "Rencana perlindungan sipil: pemantauan radiasi di pelabuhan dan pasar ikan, protokol hujan radioaktif, dan komunikasi publik yang siap sebelum kepanikan.",
      "Diplomasi: hidupkan kembali Zona Bebas Senjata Nuklir Asia Tenggara (Traktat Bangkok 1995) dan dorong negara pemilik senjata nuklir menandatangani protokolnya.",
    ],
    en: [
      "Harden the grid: spare transformers, islanding for Natuna, West Kalimantan and North Sumatra, and EMP shielding for critical facilities.",
      "Strategic fuel and food reserves of at least 60 days, with the southern (Australia) and eastern routes as official fallbacks.",
      "Civil protection planning: radiation monitoring at ports and fish markets, radioactive-rain protocols, and public communication ready before the panic.",
      "Diplomacy: revive the Southeast Asia Nuclear-Weapon-Free Zone (Bangkok Treaty 1995) and press the nuclear powers to sign its protocol.",
    ],
  },
};
