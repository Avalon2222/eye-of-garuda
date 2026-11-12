/** Tipe dan konstanta kecil yang dipakai bersama oleh hook-hook Console. */

import type { Map as MapLibre } from "maplibre-gl";
import type { GeoJSON } from "geojson";
import type { Pilihan } from "@/lib/types";
import type { Tampilan } from "@/lib/urlState";
import { LAPISAN } from "@/lib/layers";

export interface StatusSimulasi {
  id: string;
  fase: number;
  /** ms epoch saat fase ini mulai (untuk hitung mundur fase terakhir) */
  mulaiFase: number;
}

/** Daftar objek numpuk di titik klik, ditampilkan oleh PilihObjek. */
export interface PilihanKlik {
  x: number;
  y: number;
  /** ukuran wadah peta saat klik, untuk menaruh daftar supaya tidak keluar layar */
  lebar: number;
  tinggi: number;
  daftar: Pilihan[];
  sisa: number;
}

export const TAMPILAN_JAUH = { center: [118, -2] as [number, number], zoom: 1.3, pitch: 0, bearing: 0 };
export const KOSONG: GeoJSON.FeatureCollection = { type: "FeatureCollection", features: [] };

export function layarKecil(): boolean {
  return typeof window !== "undefined" && window.innerWidth < 640;
}

/** Posisi kamera saat ini dalam bentuk yang disimpan ke URL / dipulihkan setelah simulasi. */
export function tampilanPeta(m: MapLibre): Tampilan {
  const c = m.getCenter();
  return { lat: c.lat, lon: c.lng, zoom: m.getZoom(), bearing: m.getBearing(), pitch: m.getPitch() };
}

const LAPISAN_LIVE = new Set<string>(LAPISAN.filter((l) => l.jenis === "live").map((l) => l.id));

/** Lapisan yang datanya diambil pelacak live (pesawat, satelit, kapal), bukan GeoJSON statis. */
export function lapisanLive(id: string): boolean {
  return LAPISAN_LIVE.has(id);
}
