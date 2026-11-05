/**
 * Lapisan analisis (fase 3): ZEE & sembilan garis putus, radius tempur, busur impor senjata SIPRI, insiden.
 * Berkas dibangun oleh scripts/bangun_analisis.py ke public/data/.
 */

import type { Map as MapLibre } from "maplibre-gl";
import type { GeoJSON } from "geojson";
import { setDataSource } from "./mapLayers";
import { busur } from "./geo";

export interface PemasokSipri {
  negara: string;
  lat: number;
  lon: number;
  tiv_juta: number;
  persen: number;
  keyakinan: string;
  contoh: string;
  sumber: string;
  url: string;
}

export interface DataSipri {
  tujuan: { nama: string; lat: number; lon: number };
  periode: string;
  satuan: string;
  total_tiv_juta: number;
  catatan: string;
  pemasok: PemasokSipri[];
}

export interface HasilAnalisis {
  fitur: Partial<Record<"zee" | "radius" | "sipri" | "insiden", GeoJSON.FeatureCollection>>;
  sipri: DataSipri | null;
}

async function ambilJson<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

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
  const [zee, radius, buta, sipri, insiden] = await Promise.all([
    ambilJson<GeoJSON.FeatureCollection>("/data/zee.geojson"),
    ambilJson<GeoJSON.FeatureCollection>("/data/radius.geojson"),
    ambilJson<GeoJSON.FeatureCollection>("/data/radius_buta.geojson"),
    ambilJson<DataSipri>("/data/sipri.json"),
    ambilJson<GeoJSON.FeatureCollection>("/data/insiden.json"),
  ]);
  if (zee) {
    setDataSource(m, "zee", zee);
    hasil.fitur.zee = zee;
  }
  if (radius) {
    setDataSource(m, "radius", radius);
    if (buta) setDataSource(m, "radius-buta", buta);
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

/** Pola dash yang digeser tiap langkah agar busur SIPRI tampak mengalir ke Indonesia. */
const POLA_DASH: number[][] = [
  [0, 4, 3],
  [0.5, 4, 2.5],
  [1, 4, 2],
  [1.5, 4, 1.5],
  [2, 4, 1],
  [2.5, 4, 0.5],
  [3, 4, 0],
  [0, 0.5, 3, 3.5],
  [0, 1, 3, 3],
  [0, 1.5, 3, 2.5],
  [0, 2, 3, 2],
  [0, 2.5, 3, 1.5],
  [0, 3, 3, 1],
  [0, 3.5, 3, 0.5],
];

export function langkahBusur(m: MapLibre, langkah: number) {
  if (!m.getLayer("sipri-busur")) return;
  m.setPaintProperty("sipri-busur", "line-dasharray", POLA_DASH[langkah % POLA_DASH.length]);
}
