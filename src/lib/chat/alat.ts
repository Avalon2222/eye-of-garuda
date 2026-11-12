/**
 * Alat data untuk asisten. Semuanya fungsi murni di atas indeks objek (lihat indeks.ts), jadi bisa dites
 * tanpa server dan tanpa model bahasa:
 *   - cariObjek: cari objek menurut nama
 *   - terdekat: objek terdekat dari suatu tempat
 *   - hitung: jumlah objek per provinsi/jenis/negara/matra
 *   - jarak: jarak antara dua tempat
 * DEFINISI_ALAT adalah skema yang dikirim ke model (format tools OpenAI), jalankanAlat penerjemahnya.
 */

import { jarakKm } from "../geo";
import { LAPISAN_CHAT, cocokNegara, normal, type LapisanChat, type ObjekPeta } from "./indeks";
import { GAZETIR } from "./tempat";

export interface Tempat {
  nama: string;
  lon: number;
  lat: number;
  /** dari mana koordinatnya: nama objek di peta, daftar tempat umum, rata-rata objek sekota, atau koordinat mentah */
  asal: "objek" | "tempat" | "kota" | "koordinat";
  /** id objek kalau asalnya objek di peta */
  id?: string;
}

const KATA_BUANG = new Set([
  "di", "ke", "dari", "dan", "yang", "the", "of", "in", "at", "to", "from", "near", "dekat", "sekitar", "around", "pulau", "island", "kota", "city",
  "kepulauan", "kep", "islands", "provinsi", "province", "daerah", "wilayah", "area",
]);

function token(teks: string): string[] {
  return normal(teks)
    .split(" ")
    .filter((k) => k.length >= 2 && !KATA_BUANG.has(k));
}

function isLapisan(v: unknown): v is LapisanChat {
  return typeof v === "string" && (LAPISAN_CHAT as readonly string[]).includes(v);
}

const ARAH = ["utara", "timur laut", "timur", "tenggara", "selatan", "barat daya", "barat", "barat laut"];

/** Arah mata angin dari titik 1 ke titik 2. */
export function arahKompas(lon1: number, lat1: number, lon2: number, lat2: number): string {
  const r = Math.PI / 180;
  const y = Math.sin((lon2 - lon1) * r) * Math.cos(lat2 * r);
  const x = Math.cos(lat1 * r) * Math.sin(lat2 * r) - Math.sin(lat1 * r) * Math.cos(lat2 * r) * Math.cos((lon2 - lon1) * r);
  const derajat = ((Math.atan2(y, x) / r) + 360) % 360;
  return ARAH[Math.round(derajat / 45) % 8];
}

/** Nilai minimal supaya nama dianggap menunjuk satu tempat (setara satu kata yang muncul di ≤7 objek). */
const AMBANG_SPESIFIK = 0.45;

interface Skor {
  o: ObjekPeta;
  s: number;
  /** semua kata kueri ketemu di nama objek */
  lengkap: boolean;
  /** nama cukup khas untuk menunjuk satu tempat: sama persis, atau memuat kata yang langka */
  khas: boolean;
}

/** Bobot kata: kata langka ("ranai") lebih berarti daripada kata umum ("lanud"). */
function bobotKata(indeks: ObjekPeta[], kata: string[]): number[] {
  return kata.map((k) => {
    let n = 0;
    for (const o of indeks) if (` ${o.kunci} `.includes(` ${k}`)) n += 1;
    return 1 / Math.log(2 + n);
  });
}

function nilaiNama(indeks: ObjekPeta[], kueri: string, lapisan?: LapisanChat): Skor[] {
  const kata = token(kueri);
  if (kata.length === 0) return [];
  const bobot = bobotKata(indeks, kata);
  const utuh = normal(kueri);
  const hasil: Skor[] = [];
  for (const o of indeks) {
    if (lapisan && o.lapisan !== lapisan) continue;
    const nama = ` ${o.kunci} `;
    const lain = ` ${normal(`${o.kota} ${o.wilayah} ${o.jenis} ${o.negara}`)} `;
    let s = 0;
    let kena = 0;
    for (let i = 0; i < kata.length; i++) {
      const k = kata[i];
      if (nama.includes(` ${k} `)) {
        s += bobot[i];
        kena += 1;
      } else if (nama.includes(` ${k}`)) {
        s += bobot[i] * 0.8;
        kena += 1;
      } else if (k.length >= 4 && nama.includes(k)) {
        s += bobot[i] * 0.5;
        kena += 1;
      } else if (lain.includes(` ${k} `)) {
        // kata yang kena di kota/provinsi/jenis: "Lanud Ranai" harus menemukan Lanud yang ada di Ranai
        s += bobot[i] * 0.7;
      }
    }
    if (s <= 0) continue;
    const khas = o.kunci === utuh || s >= AMBANG_SPESIFIK;
    if (o.kunci === utuh) s += 5;
    else if (o.kunci.startsWith(`${utuh} `)) s += 1;
    hasil.push({ o, s, lengkap: kena === kata.length, khas });
  }
  // nilai sama: nama lebih pendek dulu (lebih spesifik)
  hasil.sort((a, b) => b.s - a.s || a.o.nama.length - b.o.nama.length);
  return hasil;
}

export interface HasilCari {
  nama: string;
  lapisan: LapisanChat;
  jenis: string;
  negara: string;
  wilayah: string;
  matra?: string;
  lon: number | null;
  lat: number | null;
  catatan: string;
}

function ringkas(o: ObjekPeta): HasilCari {
  return {
    nama: o.nama,
    lapisan: o.lapisan,
    jenis: o.jenis,
    negara: o.negara,
    wilayah: o.wilayah,
    ...(o.matra ? { matra: o.matra } : {}),
    lon: o.lon == null ? null : Number(o.lon.toFixed(3)),
    lat: o.lat == null ? null : Number(o.lat.toFixed(3)),
    catatan: o.catatan,
  };
}

/** Cari objek menurut nama (boleh sebagian). Hasil terbaik dulu. */
export function cariObjek(indeks: ObjekPeta[], kueri: string, opsi: { lapisan?: LapisanChat; batas?: number } = {}): HasilCari[] {
  const batas = Math.min(10, Math.max(1, opsi.batas ?? 5));
  const semua = nilaiNama(indeks, kueri, opsi.lapisan);
  // kalau ada yang cocok penuh, yang cocok sebagian tidak ikut supaya tidak menyesatkan
  const lengkap = semua.filter((x) => x.lengkap);
  return (lengkap.length ? lengkap : semua).slice(0, batas).map((x) => ringkas(x.o));
}

/**
 * Ubah teks tempat jadi koordinat. Urutannya: koordinat mentah ("3.9, 108.4" = lat, lon), nama tempat umum
 * (kota, selat, laut), nama objek di peta, lalu kota tempat objek berada. Mode ketat tidak menebak dari
 * kecocokan sebagian; dipakai saat memindai kalimat bebas.
 */
export function selesaikanTempat(indeks: ObjekPeta[], teks: string, opsi: { ketat?: boolean } = {}): Tempat | null {
  const mentah = teks.trim();
  if (!mentah) return null;
  const k = mentah.match(/^\s*(-?\d{1,2}(?:\.\d+)?)\s*[,;]\s*(-?\d{1,3}(?:\.\d+)?)\s*$/);
  if (k) {
    const lat = Number(k[1]);
    const lon = Number(k[2]);
    if (Math.abs(lat) <= 90 && Math.abs(lon) <= 180) return { nama: `${lat}, ${lon}`, lon, lat, asal: "koordinat" };
  }
  const n = normal(mentah);
  const persis = GAZETIR.find((g) => g.kunci.includes(n));
  if (persis) return { nama: persis.nama, lon: persis.lon, lat: persis.lat, asal: "tempat" };

  const kandidat = nilaiNama(indeks, mentah).filter((x) => x.o.lon != null && x.o.lat != null);
  // cocok penuh harus cukup spesifik: "lanud" saja cocok dengan puluhan objek, jadi bukan nama tempat
  const penuh = kandidat.find((x) => x.lengkap && x.khas);
  if (penuh) return { nama: penuh.o.nama, lon: penuh.o.lon!, lat: penuh.o.lat!, asal: "objek", id: penuh.o.id };

  // nama tempat umum yang muncul di dalam teks ("perairan Natuna", "sekitar Selat Malaka"); yang terpanjang menang
  let dalam: (typeof GAZETIR)[number] | null = null;
  let panjang = 0;
  for (const g of GAZETIR) {
    for (const kunci of g.kunci) {
      if (kunci.length > panjang && ` ${n} `.includes(` ${kunci} `)) {
        dalam = g;
        panjang = kunci.length;
      }
    }
  }
  if (dalam) return { nama: dalam.nama, lon: dalam.lon, lat: dalam.lat, asal: "tempat" };

  const sekota = indeks.filter((o) => o.lon != null && o.lat != null && o.kota && ` ${normal(o.kota)} `.includes(` ${n} `));
  if (sekota.length) {
    const lon = sekota.reduce((a, o) => a + o.lon!, 0) / sekota.length;
    const lat = sekota.reduce((a, o) => a + o.lat!, 0) / sekota.length;
    return { nama: mentah, lon, lat, asal: "kota" };
  }
  if (!opsi.ketat && kandidat.length && kandidat[0].s >= 0.3) {
    const o = kandidat[0].o;
    return { nama: o.nama, lon: o.lon!, lat: o.lat!, asal: "objek", id: o.id };
  }
  return null;
}

export interface OpsiTerdekat {
  dari: string;
  lapisan: LapisanChat;
  jumlah?: number;
  /** hanya objek milik negara ini */
  negara?: string;
  /** buang objek milik negara ini */
  kecualiNegara?: string;
  /** hanya jenis ini (mis. "Lanud", "udara", "militer") */
  jenis?: string;
}

export interface HasilTerdekat {
  dari: { nama: string; lon: number; lat: number } | null;
  galat?: "tempat_tidak_dikenal";
  hasil: (HasilCari & { km: number; arah: string })[];
}

function saringObjek(o: ObjekPeta, negara?: string, kecualiNegara?: string, jenis?: string): boolean {
  // pangkalan asing: operator tambahan ikut dihitung ("pangkalan AS" termasuk lokasi EDCA di Filipina)
  if (negara && !(cocokNegara(o.negara, negara) || (o.lapisan === "asing" && cocokNegara(o.catatan, negara)))) return false;
  if (kecualiNegara && cocokNegara(o.negara, kecualiNegara)) return false;
  if (jenis) {
    const j = normal(jenis);
    if (!` ${normal(`${o.jenis} ${o.matra} ${o.nama}`)} `.includes(` ${j}`)) return false;
  }
  return true;
}

/** Objek terdekat dari suatu tempat, diurutkan dari yang paling dekat. */
export function terdekat(indeks: ObjekPeta[], opsi: OpsiTerdekat): HasilTerdekat {
  const asal = selesaikanTempat(indeks, opsi.dari);
  if (!asal) return { dari: null, galat: "tempat_tidak_dikenal", hasil: [] };
  const jumlah = Math.min(10, Math.max(1, opsi.jumlah ?? 5));
  const daftar: { o: ObjekPeta; km: number }[] = [];
  for (const o of indeks) {
    if (o.lapisan !== opsi.lapisan || o.lon == null || o.lat == null) continue;
    if (asal.id && o.id === asal.id) continue;
    if (!saringObjek(o, opsi.negara, opsi.kecualiNegara, opsi.jenis)) continue;
    daftar.push({ o, km: jarakKm(asal.lon, asal.lat, o.lon, o.lat) });
  }
  daftar.sort((a, b) => a.km - b.km);
  // sumber data kadang memuat satu tempat dua kali; nama yang sama cukup muncul sekali
  const unik: typeof daftar = [];
  const terlihat = new Set<string>();
  for (const d of daftar) {
    if (terlihat.has(d.o.kunci)) continue;
    terlihat.add(d.o.kunci);
    unik.push(d);
    if (unik.length >= jumlah) break;
  }
  return {
    dari: { nama: asal.nama, lon: Number(asal.lon.toFixed(3)), lat: Number(asal.lat.toFixed(3)) },
    hasil: unik.map(({ o, km }) => ({ ...ringkas(o), km: Math.round(km), arah: arahKompas(asal.lon, asal.lat, o.lon!, o.lat!) })),
  };
}

export type Kelompok = "jenis" | "negara" | "wilayah" | "matra";

export interface OpsiHitung {
  lapisan: LapisanChat;
  kelompok?: Kelompok;
  /** teks bebas: hanya objek yang provinsi/negara/kota/jenis/matra/namanya memuat teks ini */
  saring?: string;
}

export interface HasilHitung {
  lapisan: LapisanChat;
  saring?: string;
  total: number;
  kelompok?: Kelompok;
  rincian?: [string, number][];
}

/** Jumlah objek di satu lapisan, bisa disaring dan dikelompokkan. */
export function hitung(indeks: ObjekPeta[], opsi: OpsiHitung): HasilHitung {
  const s = opsi.saring ? normal(opsi.saring) : "";
  const cocok = indeks.filter((o) => {
    if (o.lapisan !== opsi.lapisan) return false;
    if (!s) return true;
    if (cocokNegara(o.negara, s)) return true;
    return ` ${normal(`${o.wilayah} ${o.kota} ${o.jenis} ${o.matra} ${o.nama}`)} `.includes(` ${s}`);
  });
  const hasil: HasilHitung = { lapisan: opsi.lapisan, total: cocok.length };
  if (opsi.saring) hasil.saring = opsi.saring;
  if (opsi.kelompok) {
    const peta = new Map<string, number>();
    for (const o of cocok) {
      const kunci = o[opsi.kelompok] || "(kosong)";
      peta.set(kunci, (peta.get(kunci) ?? 0) + 1);
    }
    hasil.kelompok = opsi.kelompok;
    hasil.rincian = [...peta.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 40);
  }
  return hasil;
}

export interface HasilJarak {
  dari: { nama: string; lon: number; lat: number } | null;
  ke: { nama: string; lon: number; lat: number } | null;
  km?: number;
  mil_laut?: number;
  arah?: string;
  galat?: "tempat_tidak_dikenal";
}

/** Jarak lingkaran besar antara dua tempat. */
export function jarak(indeks: ObjekPeta[], dari: string, ke: string): HasilJarak {
  const a = selesaikanTempat(indeks, dari);
  const b = selesaikanTempat(indeks, ke);
  const rapi = (t: Tempat | null) => (t ? { nama: t.nama, lon: Number(t.lon.toFixed(3)), lat: Number(t.lat.toFixed(3)) } : null);
  if (!a || !b) return { dari: rapi(a), ke: rapi(b), galat: "tempat_tidak_dikenal" };
  const km = jarakKm(a.lon, a.lat, b.lon, b.lat);
  return { dari: rapi(a), ke: rapi(b), km: Math.round(km), mil_laut: Math.round(km / 1.852), arah: arahKompas(a.lon, a.lat, b.lon, b.lat) };
}

// ---------- antarmuka untuk model bahasa ----------

const DAFTAR_LAPISAN = [...LAPISAN_CHAT];
const KET_LAPISAN =
  "Layer: tni (Indonesian military bases), asing (foreign bases in the region), bandara (airports), pelabuhan (ports), batas (outer islands, border posts, hotspots), kapalselam (submarine home ports), landing (cable landing stations), kabel (undersea cables), insiden (incidents & exercises).";

export const DEFINISI_ALAT = [
  {
    type: "function",
    function: {
      name: "terdekat",
      description: "Nearest map objects of one layer to a place, sorted by great-circle distance in km. Use for any 'nearest/closest/terdekat' question.",
      parameters: {
        type: "object",
        properties: {
          dari: { type: "string", description: "Origin: place, city, island, strait or object name (e.g. 'Natuna', 'Lanud Ranai', 'Darwin') or 'lat, lon'." },
          lapisan: { type: "string", enum: DAFTAR_LAPISAN, description: KET_LAPISAN },
          jumlah: { type: "integer", description: "How many results (1-10, default 5)." },
          negara: { type: "string", description: "Optional: only objects owned/operated by this country (e.g. 'China', 'Amerika Serikat')." },
          kecuali_negara: { type: "string", description: "Optional: exclude objects of this country." },
          jenis: { type: "string", description: "Optional type filter, e.g. 'Lanud', 'Lanal', 'Korem', 'udara', 'laut', 'militer'." },
        },
        required: ["dari", "lapisan"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "hitung",
      description: "Count map objects in one layer, optionally filtered and grouped. Use for any 'how many/berapa/jumlah' question.",
      parameters: {
        type: "object",
        properties: {
          lapisan: { type: "string", enum: DAFTAR_LAPISAN, description: KET_LAPISAN },
          kelompok: { type: "string", enum: ["jenis", "negara", "wilayah", "matra"], description: "Group by: jenis (type), negara (owner country), wilayah (province for tni/batas, host country for asing), matra (AD/AL/AU for tni)." },
          saring: { type: "string", description: "Optional text filter on province, country, city, type or name, e.g. 'Papua', 'Lanud', 'China'." },
        },
        required: ["lapisan"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "cari_objek",
      description: "Find map objects by name and get their type, owner, region and coordinates. Use for 'where is X / X di mana / what is X'.",
      parameters: {
        type: "object",
        properties: {
          kueri: { type: "string", description: "Name or part of a name, e.g. 'Lanud Ranai', 'Fiery Cross', 'Changi'." },
          lapisan: { type: "string", enum: DAFTAR_LAPISAN, description: "Optional layer to restrict the search." },
          batas: { type: "integer", description: "Max results (1-10, default 5)." },
        },
        required: ["kueri"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "jarak",
      description: "Great-circle distance in km and nautical miles between two places or map objects.",
      parameters: {
        type: "object",
        properties: {
          dari: { type: "string", description: "Place or object name, or 'lat, lon'." },
          ke: { type: "string", description: "Place or object name, or 'lat, lon'." },
        },
        required: ["dari", "ke"],
      },
    },
  },
] as const;

export type NamaAlat = (typeof DEFINISI_ALAT)[number]["function"]["name"];

function str(v: unknown): string | undefined {
  return typeof v === "string" && v.trim() ? v.trim().slice(0, 120) : undefined;
}
function angka(v: unknown): number | undefined {
  const n = typeof v === "string" ? Number(v) : v;
  return typeof n === "number" && Number.isFinite(n) ? n : undefined;
}

/** Jalankan satu panggilan alat dari model. Argumen yang ngawur dibalas galat, tidak pernah melempar. */
export function jalankanAlat(indeks: ObjekPeta[], nama: string, argumen: unknown): unknown {
  const a = (argumen && typeof argumen === "object" ? argumen : {}) as Record<string, unknown>;
  switch (nama) {
    case "terdekat": {
      const dari = str(a.dari);
      if (!dari || !isLapisan(a.lapisan)) return { galat: "argumen_salah" };
      return terdekat(indeks, { dari, lapisan: a.lapisan, jumlah: angka(a.jumlah), negara: str(a.negara), kecualiNegara: str(a.kecuali_negara), jenis: str(a.jenis) });
    }
    case "hitung": {
      if (!isLapisan(a.lapisan)) return { galat: "argumen_salah" };
      const kelompok = a.kelompok === "jenis" || a.kelompok === "negara" || a.kelompok === "wilayah" || a.kelompok === "matra" ? a.kelompok : undefined;
      return hitung(indeks, { lapisan: a.lapisan, kelompok, saring: str(a.saring) });
    }
    case "cari_objek": {
      const kueri = str(a.kueri);
      if (!kueri) return { galat: "argumen_salah" };
      const hasil = cariObjek(indeks, kueri, { lapisan: isLapisan(a.lapisan) ? a.lapisan : undefined, batas: angka(a.batas) });
      return { jumlah: hasil.length, hasil };
    }
    case "jarak": {
      const dari = str(a.dari);
      const ke = str(a.ke);
      if (!dari || !ke) return { galat: "argumen_salah" };
      return jarak(indeks, dari, ke);
    }
    default:
      return { galat: "alat_tidak_dikenal" };
  }
}
