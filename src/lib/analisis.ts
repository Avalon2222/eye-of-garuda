/**
 * Lapisan analisis (fase 3): ZEE & sembilan garis putus, radius tempur, busur SIPRI, insiden.
 * Diisi pada fase 3; untuk sekarang hanya memuat berkas yang tersedia.
 */

import type { Map as MapLibre } from "maplibre-gl";
import type { GeoJSON } from "geojson";
import { setDataSource } from "./mapLayers";

export async function muatAnalisis(m: MapLibre, tni: GeoJSON.FeatureCollection): Promise<Partial<Record<string, GeoJSON.FeatureCollection>>> {
  const hasil: Partial<Record<string, GeoJSON.FeatureCollection>> = {};
  void tni;
  try {
    const res = await fetch("/data/zee.geojson");
    if (res.ok) {
      const fc = (await res.json()) as GeoJSON.FeatureCollection;
      setDataSource(m, "zee", fc);
      hasil.zee = fc;
    }
  } catch {
    /* belum ada */
  }
  return hasil;
}
