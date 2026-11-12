/**
 * Indeks objek peta untuk asisten: semua titik dari GeoJSON di public/data diratakan jadi satu daftar
 * dengan kolom yang seragam (nama, lapisan, jenis, negara, wilayah, koordinat). Alat chatbot di alat.ts
 * bekerja di atas daftar ini, jadi jawabannya dihitung dari data, bukan ditebak model.
 */

export const LAPISAN_CHAT = ["tni", "asing", "bandara", "pelabuhan", "batas", "kapalselam", "landing", "kabel", "insiden"] as const;
export type LapisanChat = (typeof LAPISAN_CHAT)[number];

/** Berkas sumber per lapisan chat (di public/data). */
export const BERKAS_CHAT: Record<LapisanChat, string> = {
  tni: "markas_tni.geojson",
  asing: "pangkalan_asing.geojson",
  bandara: "bandara.geojson",
  pelabuhan: "pelabuhan.geojson",
  batas: "perbatasan.geojson",
  kapalselam: "kapal_selam.geojson",
  landing: "landing_station.geojson",
  kabel: "kabel.geojson",
  insiden: "insiden.json",
};

export const NAMA_LAPISAN_CHAT: Record<LapisanChat, { id: string; en: string }> = {
  tni: { id: "markas TNI", en: "TNI bases" },
  asing: { id: "pangkalan asing", en: "foreign bases" },
  bandara: { id: "bandara", en: "airports" },
  pelabuhan: { id: "pelabuhan", en: "ports" },
  batas: { id: "pulau terluar & perbatasan", en: "outer islands & borders" },
  kapalselam: { id: "pangkalan kapal selam", en: "submarine home ports" },
  landing: { id: "landing station kabel", en: "cable landing stations" },
  kabel: { id: "kabel bawah laut", en: "undersea cables" },
  insiden: { id: "insiden & latihan", en: "incidents & exercises" },
};

export interface ObjekPeta {
  id: string;
  nama: string;
  lapisan: LapisanChat;
  /** Lanud, Korem, udara, laut, pulau_terluar, besar/sedang/militer, aktif/rencana, ... */
  jenis: string;
  /** negara pemilik/operator; "Indonesia" untuk markas TNI dan perbatasan */
  negara: string;
  /** provinsi (TNI, perbatasan), negara tuan rumah (pangkalan asing), kota (bandara) */
  wilayah: string;
  kota: string;
  /** AD/AL/AU/Gabungan, hanya markas TNI */
  matra: string;
  lon: number | null;
  lat: number | null;
  /** keterangan pendek yang ikut dikirim ke model */
  catatan: string;
  /** nama yang sudah dinormalkan, untuk pencarian */
  kunci: string;
}

interface FiturMentah {
  properties?: Record<string, unknown> | null;
  geometry?: { type?: string; coordinates?: unknown } | null;
}
export interface KoleksiMentah {
  features?: FiturMentah[];
}

/** Huruf kecil, tanpa aksen, tanda baca jadi spasi. */
export function normal(teks: string): string {
  return teks
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** Ejaan negara yang berbeda-beda di sumber data disatukan ke nama Indonesia. */
const ALIAS_NEGARA: Record<string, string> = {
  philippines: "filipina",
  singapore: "singapura",
  "papua new guinea": "papua nugini",
  png: "papua nugini",
  cambodia: "kamboja",
  "united states": "amerika serikat",
  "united states of america": "amerika serikat",
  usa: "amerika serikat",
  us: "amerika serikat",
  as: "amerika serikat",
  amerika: "amerika serikat",
  america: "amerika serikat",
  american: "amerika serikat",
  japan: "jepang",
  "south korea": "korea selatan",
  korsel: "korea selatan",
  uk: "inggris",
  "united kingdom": "inggris",
  britain: "inggris",
  british: "inggris",
  tiongkok: "china",
  cina: "china",
  chinese: "china",
  prc: "china",
  rrt: "china",
  australian: "australia",
  indian: "india",
  malaysian: "malaysia",
  vietnamese: "vietnam",
  thai: "thailand",
  "east timor": "timor leste",
  "timor timur": "timor leste",
  "christmas island": "pulau christmas",
  micronesia: "mikronesia",
  indonesian: "indonesia",
};

export function normalNegara(teks: string): string {
  const n = normal(teks);
  return ALIAS_NEGARA[n] ?? n;
}

/** Cocokkan nama negara dengan toleran: "AS" cocok dengan "Amerika Serikat (+ Inggris)", "Guam (AS)", dst. */
export function cocokNegara(nilai: string, dicari: string): boolean {
  const cari = normalNegara(dicari);
  if (!cari) return true;
  const n = normal(nilai);
  if (!n) return false;
  if (normalNegara(nilai) === cari) return true;
  // alias per kata, supaya "Guam (AS)" terbaca "guam amerika serikat"
  const kata = n
    .split(" ")
    .map((k) => ALIAS_NEGARA[k] ?? k)
    .join(" ");
  return ` ${kata} `.includes(` ${cari} `);
}

function teks(v: unknown): string {
  if (v == null) return "";
  return String(v).trim();
}

function titik(f: FiturMentah): [number | null, number | null] {
  const g = f.geometry;
  if (g?.type === "Point" && Array.isArray(g.coordinates)) {
    const [lon, lat] = g.coordinates as number[];
    if (typeof lon === "number" && typeof lat === "number") return [lon, lat];
  }
  return [null, null];
}

function potong(s: string, n: number): string {
  return s.length > n ? `${s.slice(0, n - 1).trimEnd()}…` : s;
}

type Pembuat = (p: Record<string, unknown>) => Omit<ObjekPeta, "id" | "nama" | "lapisan" | "lon" | "lat" | "kunci">;

const PEMBUAT: Record<LapisanChat, Pembuat> = {
  tni: (p) => ({
    jenis: teks(p.jenis),
    negara: "Indonesia",
    wilayah: teks(p.provinsi),
    kota: teks(p.kota),
    matra: teks(p.matra),
    catatan: potong(teks(p.keterangan), 90),
  }),
  asing: (p) => ({
    jenis: teks(p.jenis),
    negara: teks(p.operator_utama) || teks(p.operator),
    wilayah: teks(p.tuan_rumah),
    kota: "",
    matra: "",
    catatan: [teks(p.operator) !== teks(p.operator_utama) ? `operator: ${teks(p.operator)}` : "", teks(p.status), p.kurasi === false ? "belum diverifikasi" : ""].filter(Boolean).join("; "),
  }),
  bandara: (p) => ({
    jenis: p.militer === true && teks(p.kelas) !== "militer" ? `${teks(p.kelas)} (militer)` : teks(p.kelas),
    negara: teks(p.negara),
    wilayah: teks(p.kota),
    kota: teks(p.kota),
    matra: "",
    catatan: [teks(p.icao), teks(p.iata)].filter(Boolean).join("/"),
  }),
  pelabuhan: (p) => ({ jenis: "pelabuhan", negara: teks(p.negara), wilayah: "", kota: "", matra: "", catatan: "" }),
  batas: (p) => ({
    jenis: teks(p.jenis),
    negara: "Indonesia",
    wilayah: teks(p.provinsi),
    kota: "",
    matra: "",
    catatan: potong([teks(p.berbatasan) ? `berbatasan: ${teks(p.berbatasan)}` : "", teks(p.keterangan)].filter(Boolean).join("; "), 110),
  }),
  kapalselam: (p) => ({
    jenis: teks(p.status),
    negara: teks(p.negara),
    wilayah: "",
    kota: "",
    matra: "",
    catatan: potong(`${teks(p.jumlah)} kapal selam; ${teks(p.kelas)}`, 110),
  }),
  landing: (p) => ({
    jenis: "landing station",
    negara: teks(p.negara),
    wilayah: "",
    kota: "",
    matra: "",
    catatan: `${teks(p.n_kabel)} kabel`,
  }),
  kabel: (p) => ({
    jenis: teks(p.kategori),
    negara: "",
    wilayah: "",
    kota: "",
    matra: "",
    catatan: [teks(p.status), p.panjang_km ? `${Math.round(Number(p.panjang_km)).toLocaleString("en-US")} km` : "", teks(p.rfs) ? `RFS ${teks(p.rfs)}` : ""].filter(Boolean).join("; "),
  }),
  insiden: (p) => ({
    jenis: teks(p.kategori),
    negara: "",
    wilayah: "",
    kota: "",
    matra: "",
    catatan: potong(`${teks(p.tanggal)}; ${teks(p.keterangan)}`, 140),
  }),
};

/** Ratakan semua koleksi jadi satu daftar. Jumlah per lapisan sama dengan yang tampil di peta. */
export function bangunIndeks(sumber: Partial<Record<LapisanChat, KoleksiMentah>>): ObjekPeta[] {
  const hasil: ObjekPeta[] = [];
  for (const lapisan of LAPISAN_CHAT) {
    const fitur = sumber[lapisan]?.features;
    if (!Array.isArray(fitur)) continue;
    for (const f of fitur) {
      const p = f.properties ?? {};
      const nama = teks(p.nama) || teks(p.judul);
      if (!nama) continue;
      const [lon, lat] = titik(f);
      hasil.push({ id: teks(p.id) || `${lapisan}-${hasil.length}`, nama, lapisan, lon, lat, kunci: normal(nama), ...PEMBUAT[lapisan](p) });
    }
  }
  return hasil;
}
