/**
 * Registri lapisan. Menambah lapisan baru = menambah satu entri di sini + fungsi pemasang di mapLayers.ts.
 */

export type LayerId =
  | "tni"
  | "batas"
  | "asing"
  | "alki"
  | "kabel"
  | "pesawat"
  | "satelit"
  | "kapal"
  | "zee"
  | "radius"
  | "sipri"
  | "insiden"
  | "bandara"
  | "pelabuhan"
  | "kapalselam";

export type Grup = "darat" | "laut" | "udara" | "analisis";

export interface LayerDef {
  id: LayerId;
  /** tombol angka untuk pintasan keyboard */
  tombol: string;
  nama: { id: string; en: string };
  deskripsi: { id: string; en: string };
  grup: Grup;
  warna: string;
  jenis: "statis" | "live" | "analisis";
  /** file GeoJSON di public/data (untuk lapisan statis) */
  berkas?: string;
  aktifAwal: boolean;
  fase: 1 | 2 | 3;
}

export const LAPISAN: LayerDef[] = [
  {
    id: "tni",
    tombol: "1",
    nama: { id: "Markas TNI", en: "TNI bases" },
    deskripsi: { id: "Mabes, Kogabwilhan, Kodam, Lantamal, Koarmada, Lanud", en: "HQ, joint commands, army, navy and air force bases" },
    grup: "darat",
    warna: "#ff5a3c",
    jenis: "statis",
    berkas: "markas_tni.geojson",
    aktifAwal: true,
    fase: 1,
  },
  {
    id: "asing",
    tombol: "2",
    nama: { id: "Pangkalan asing di kawasan", en: "Foreign bases in the region" },
    deskripsi: { id: "AS, Australia, China, India, dan negara tetangga", en: "US, Australia, China, India and neighbours" },
    grup: "darat",
    warna: "#3b82f6",
    jenis: "statis",
    berkas: "pangkalan_asing.geojson",
    aktifAwal: true,
    fase: 1,
  },
  {
    id: "bandara",
    tombol: "[",
    nama: { id: "Bandara & lapangan udara", en: "Airports & airfields" },
    deskripsi: { id: "Bandara besar/sedang di kawasan + lapangan udara militer (OurAirports)", en: "Large/medium airports in the region + military airfields (OurAirports)" },
    grup: "darat",
    warna: "#f0abfc",
    jenis: "statis",
    berkas: "bandara.geojson",
    aktifAwal: true,
    fase: 3,
  },
  {
    id: "batas",
    tombol: "3",
    nama: { id: "Pulau terluar & perbatasan", en: "Outer islands & borders" },
    deskripsi: { id: "Pulau terluar, PLBN, wilayah rawan", en: "Outer islands, land border posts, hotspots" },
    grup: "darat",
    warna: "#22c55e",
    jenis: "statis",
    berkas: "perbatasan.geojson",
    aktifAwal: true,
    fase: 1,
  },
  {
    id: "alki",
    tombol: "4",
    nama: { id: "ALKI", en: "Archipelagic sea lanes" },
    deskripsi: { id: "Alur Laut Kepulauan Indonesia I, II, III", en: "Indonesian archipelagic sea lanes I, II, III" },
    grup: "laut",
    warna: "#38bdf8",
    jenis: "statis",
    berkas: "alki.geojson",
    aktifAwal: true,
    fase: 1,
  },
  {
    id: "kabel",
    tombol: "5",
    nama: { id: "Kabel bawah laut", en: "Undersea cables" },
    deskripsi: { id: "Kabel yang mendarat di atau melintasi Indonesia + landing station", en: "Cables landing in or crossing Indonesia + landing stations" },
    grup: "laut",
    warna: "#22d3ee",
    jenis: "statis",
    berkas: "kabel.geojson",
    aktifAwal: true,
    fase: 1,
  },
  {
    id: "pelabuhan",
    tombol: "]",
    nama: { id: "Pelabuhan", en: "Ports" },
    deskripsi: { id: "Pelabuhan laut di kawasan (Wikidata)", en: "Seaports across the region (Wikidata)" },
    grup: "laut",
    warna: "#5eead4",
    jenis: "statis",
    berkas: "pelabuhan.geojson",
    aktifAwal: true,
    fase: 3,
  },
  {
    id: "kapalselam",
    tombol: ";",
    nama: { id: "Kapal selam (pangkalan)", en: "Submarines (home ports)" },
    deskripsi: { id: "Armada kapal selam kawasan per pangkalan; posisi live tidak tersedia", en: "Regional submarine fleets by home port; no live positions exist" },
    grup: "laut",
    warna: "#67e8f9",
    jenis: "statis",
    berkas: "kapal_selam.geojson",
    aktifAwal: true,
    fase: 3,
  },
  {
    id: "kapal",
    tombol: "6",
    nama: { id: "Kapal (AIS)", en: "Ships (AIS)" },
    deskripsi: { id: "Live AIS via aisstream + snapshot 30 menit; militer, patroli, tanker, kargo", en: "Live AIS via aisstream + 30-min snapshot; military, patrol, tanker, cargo" },
    grup: "laut",
    warna: "#a3e635",
    jenis: "live",
    aktifAwal: true,
    fase: 2,
  },
  {
    id: "pesawat",
    tombol: "7",
    nama: { id: "Pesawat & helikopter militer (live)", en: "Military aircraft & helicopters (live)" },
    deskripsi: { id: "ADS-B militer tiap 10 detik: jet, heli, tanker, angkut, intai", en: "Military ADS-B every 10 s: jets, helicopters, tankers, transports, ISR" },
    grup: "udara",
    warna: "#facc15",
    jenis: "live",
    aktifAwal: true,
    fase: 2,
  },
  {
    id: "satelit",
    tombol: "8",
    nama: { id: "Satelit militer & pengintai", en: "Military & spy satellites" },
    deskripsi: { id: "Dipropagasi dari TLE di browser", en: "Propagated from TLE in the browser" },
    grup: "udara",
    warna: "#fb923c",
    jenis: "live",
    aktifAwal: true,
    fase: 2,
  },
  {
    id: "zee",
    tombol: "9",
    nama: { id: "ZEE & sembilan garis putus", en: "EEZ & nine-dash line" },
    deskripsi: { id: "ZEE Indonesia, klaim China, tumpang tindih di Natuna", en: "Indonesian EEZ, Chinese claim, Natuna overlap" },
    grup: "analisis",
    warna: "#f472b6",
    jenis: "analisis",
    berkas: "zee.geojson",
    aktifAwal: true,
    fase: 3,
  },
  {
    id: "radius",
    tombol: "0",
    nama: { id: "Radius tempur", en: "Combat radius" },
    deskripsi: { id: "Lingkaran jangkauan Rafale, F-16, Su-30 dari tiap Lanud", en: "Rafale, F-16, Su-30 reach circles from each air base" },
    grup: "analisis",
    warna: "#e879f9",
    jenis: "analisis",
    aktifAwal: true,
    fase: 3,
  },
  {
    id: "sipri",
    tombol: "-",
    nama: { id: "Impor senjata (SIPRI)", en: "Arms imports (SIPRI)" },
    deskripsi: { id: "Busur dari negara pemasok, 2000–2025, langsung dari database SIPRI", en: "Arcs from supplier countries, 2000–2025, straight from the SIPRI database" },
    grup: "analisis",
    warna: "#c084fc",
    jenis: "analisis",
    berkas: "sipri.json",
    aktifAwal: true,
    fase: 3,
  },
  {
    id: "insiden",
    tombol: "=",
    nama: { id: "Insiden & latihan", en: "Incidents & exercises" },
    deskripsi: { id: "Lini masa Natuna, Super Garuda Shield, Komodo", en: "Natuna timeline, Super Garuda Shield, Komodo" },
    grup: "analisis",
    warna: "#f87171",
    jenis: "analisis",
    berkas: "insiden.json",
    aktifAwal: false,
    fase: 3,
  },
];

/** Lapisan untuk tampilan awal dan tombol reset: ramai tapi ringan (detail kecil baru muncul saat zoom). */
export const LAPISAN_BAWAAN: LayerId[] = LAPISAN.filter((l) => l.aktifAwal).map((l) => l.id);

export const GRUP_URUT: Grup[] = ["darat", "laut", "udara", "analisis"];

export function lapisanDariId(id: string): LayerDef | undefined {
  return LAPISAN.find((l) => l.id === id);
}

export const WARNA_MATRA: Record<string, string> = {
  AD: "#86efac",
  AL: "#7dd3fc",
  AU: "#c4b5fd",
  Gabungan: "#ff5a3c",
};

export const WARNA_OPERATOR: Record<string, string> = {
  "Amerika Serikat": "#3b82f6",
  Australia: "#fbbf24",
  China: "#ef4444",
  India: "#f97316",
  Inggris: "#60a5fa",
  Singapura: "#e879f9",
  Malaysia: "#a3e635",
  Filipina: "#38bdf8",
  Vietnam: "#facc15",
  Thailand: "#f472b6",
  Kamboja: "#ef4444",
  "Papua Nugini": "#34d399",
  Taiwan: "#fb7185",
  Brunei: "#fde047",
  Myanmar: "#a8a29e",
  "Timor-Leste": "#f87171",
};
