/**
 * Lapisan analisis (fase 3): ZEE & sembilan garis putus, radius tempur, busur impor senjata SIPRI, insiden.
 * Berkas dibangun oleh scripts/bangun_analisis.py dan scripts/ambil_sipri.py ke public/data/.
 * Data SIPRI juga diperbarui bulanan ke cabang `data` oleh GitHub Actions; browser mencoba versi itu dulu.
 */

import type { Map as MapLibre } from "maplibre-gl";
import type { GeoJSON } from "geojson";
import { setDataSource } from "./mapLayers";
import { busur } from "./geo";

export interface PemasokSipri {
  negara: string;
  negara_en?: string;
  lat: number;
  lon: number;
  tiv_juta: number;
  persen: number;
  /** nilai per tahun, sejajar dengan DataSipri.tahun */
  seri?: number[];
  tahun_puncak?: number | null;
  contoh: string;
  sumber: string;
  url: string;
}

export interface DataSipri {
  tujuan: { nama: string; lat: number; lon: number };
  periode: string;
  tahun?: number[];
  satuan: string;
  total_tiv_juta: number;
  total_per_tahun?: number[];
  lainnya_tiv_juta?: number;
  diambil?: string;
  catatan: string;
  pemasok: PemasokSipri[];
}

export interface HasilAnalisis {
  fitur: Partial<Record<"zee" | "radius" | "sipri" | "insiden", GeoJSON.FeatureCollection>>;
  sipri: DataSipri | null;
}

export const URL_SIPRI_RAW = "https://raw.githubusercontent.com/Avalon2222/eye-of-garuda/data/sipri.json";

async function ambilJson<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

/** "1,234" untuk angka TIV; "?" kalau kosong (null), supaya toLocaleString tidak membuat panel error. */
export function formatTiv(n: number | null | undefined): string {
  return typeof n === "number" && Number.isFinite(n) ? n.toLocaleString("en-US") : "?";
}

/**
 * Baris legenda SIPRI: pemasok terurut dari TIV terbesar, dengan lebar batang 0..100 (%).
 * TIV kosong (null) dianggap 0 dan ditaruh paling bawah; kalau semua nol, batangnya 0%, bukan NaN%.
 */
export function barisLegendaSipri(d: DataSipri): { pemasok: PemasokSipri; lebar: number }[] {
  const tiv = (p: PemasokSipri) => (Number.isFinite(p.tiv_juta) ? p.tiv_juta : 0);
  const urut = [...d.pemasok].sort((a, b) => tiv(b) - tiv(a));
  const maks = urut.length ? tiv(urut[0]) : 0;
  return urut.map((p) => ({ pemasok: p, lebar: maks > 0 ? (tiv(p) / maks) * 100 : 0 }));
}

/** Busur SIPRI: garis (untuk MapLibre + sorot) dan titik label. Koordinat busur juga dipakai kanvas untuk "komet". */
export function bangunBusurSipri(d: DataSipri): { garis: GeoJSON.FeatureCollection; titik: GeoJSON.FeatureCollection } {
  // TIV kosong (null) di JSON sumber dianggap 0: null.toLocaleString() membuat seluruh lapisan gagal dibangun.
  const tivDari = (p: PemasokSipri) => (Number.isFinite(p.tiv_juta) ? p.tiv_juta : 0);
  // Kalau semua TIV nol (mis. data sementara), pembagi nol membuat tebal garis NaN dan garisnya hilang.
  // Pemasok tanpa koordinat dilewati: busur dari NaN menghasilkan geometri rusak yang ditolak MapLibre.
  const pemasok = d.pemasok.filter((p) => Number.isFinite(p.lon) && Number.isFinite(p.lat));
  const maks = Math.max(0, ...pemasok.map(tivDari)) || 1;
  // Persen kosong tidak boleh tampil sebagai "null%" di label peta.
  const persenTeks = (p: PemasokSipri) => (Number.isFinite(p.persen) ? `${p.persen}%` : "?%");
  const garis: GeoJSON.Feature[] = pemasok.map((p) => ({
    type: "Feature",
    properties: {
      id: `sipri-${p.negara}`,
      nama: `${p.negara} → Indonesia`,
      sub: `${formatTiv(p.tiv_juta)} juta TIV · ${persenTeks(p)} (${d.periode})`,
      negara: p.negara,
      tiv: tivDari(p),
      persen: p.persen,
      tahun_puncak: p.tahun_puncak ?? null,
      tebal: 1 + (9 * tivDari(p)) / maks,
      keterangan: `${p.contoh}. ${d.catatan}`,
      sumber: p.sumber,
      url: p.url,
    },
    geometry: { type: "LineString", coordinates: busur(p.lon, p.lat, d.tujuan.lon, d.tujuan.lat, 64) },
  }));
  const titik: GeoJSON.Feature[] = pemasok.map((p) => ({
    type: "Feature",
    properties: { id: `sipri-titik-${p.negara}`, label: Number.isFinite(p.persen) ? `${p.negara} ${p.persen}%` : p.negara, negara: p.negara },
    geometry: { type: "Point", coordinates: [p.lon, p.lat] },
  }));
  return { garis: { type: "FeatureCollection", features: garis }, titik: { type: "FeatureCollection", features: titik } };
}

/** Data SIPRI yang bisa digambar: punya daftar pemasok dan koordinat tujuan yang berupa angka. */
function sipriSah(d: DataSipri | null): d is DataSipri {
  return !!d && Array.isArray(d.pemasok) && d.pemasok.length > 0 && Number.isFinite(d.tujuan?.lon) && Number.isFinite(d.tujuan?.lat);
}

/**
 * Pilih versi cabang `data` kalau isinya sah, kalau tidak versi lokal. Dulu hanya `pemasok` yang dicek,
 * jadi berkas tanpa `tujuan` membuat bangunBusurSipri error dan semua lapisan analisis gagal dimuat.
 */
export function pilihSipri(raw: DataSipri | null, lokal: DataSipri | null): DataSipri | null {
  if (sipriSah(raw)) return raw;
  return sipriSah(lokal) ? lokal : null;
}

export async function muatAnalisis(m: MapLibre): Promise<HasilAnalisis> {
  const hasil: HasilAnalisis = { fitur: {}, sipri: null };
  const [zee, radius, sipriRaw, sipriLokal, insiden] = await Promise.all([
    ambilJson<GeoJSON.FeatureCollection>("/data/zee.geojson"),
    ambilJson<GeoJSON.FeatureCollection>("/data/radius.geojson"),
    ambilJson<DataSipri>(URL_SIPRI_RAW),
    ambilJson<DataSipri>("/data/sipri.json"),
    ambilJson<GeoJSON.FeatureCollection>("/data/insiden.json"),
  ]);
  const sipri = pilihSipri(sipriRaw, sipriLokal);
  if (zee) {
    setDataSource(m, "zee", zee);
    hasil.fitur.zee = zee;
  }
  if (radius) {
    setDataSource(m, "radius", radius);
    hasil.fitur.radius = radius;
  }
  if (sipri) {
    const { garis, titik } = bangunBusurSipri(sipri);
    setDataSource(m, "sipri", garis);
    setDataSource(m, "sipri-titik", titik);
    hasil.fitur.sipri = garis;
    hasil.sipri = sipri;
  }
  if (insiden) {
    setDataSource(m, "insiden", insiden);
    hasil.fitur.insiden = insiden;
  }
  return hasil;
}
