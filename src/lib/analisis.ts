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

/** Busur SIPRI: garis (untuk MapLibre + sorot) dan titik label. Koordinat busur juga dipakai kanvas untuk "komet". */
export function bangunBusurSipri(d: DataSipri): { garis: GeoJSON.FeatureCollection; titik: GeoJSON.FeatureCollection } {
  const maks = Math.max(...d.pemasok.map((p) => p.tiv_juta));
  const garis: GeoJSON.Feature[] = d.pemasok.map((p) => ({
    type: "Feature",
    properties: {
      id: `sipri-${p.negara}`,
      nama: `${p.negara} → Indonesia`,
      sub: `${p.tiv_juta.toLocaleString("en-US")} juta TIV · ${p.persen}% (${d.periode})`,
      negara: p.negara,
      tiv: p.tiv_juta,
      persen: p.persen,
      tahun_puncak: p.tahun_puncak ?? null,
      tebal: 1 + (9 * p.tiv_juta) / maks,
      keterangan: `${p.contoh}. ${d.catatan}`,
      sumber: p.sumber,
      url: p.url,
    },
    geometry: { type: "LineString", coordinates: busur(p.lon, p.lat, d.tujuan.lon, d.tujuan.lat, 64) },
  }));
  const titik: GeoJSON.Feature[] = d.pemasok.map((p) => ({
    type: "Feature",
    properties: { id: `sipri-titik-${p.negara}`, label: `${p.negara} ${p.persen}%`, negara: p.negara },
    geometry: { type: "Point", coordinates: [p.lon, p.lat] },
  }));
  return { garis: { type: "FeatureCollection", features: garis }, titik: { type: "FeatureCollection", features: titik } };
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
  const sipri = sipriRaw && Array.isArray(sipriRaw.pemasok) && sipriRaw.pemasok.length ? sipriRaw : sipriLokal;
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
