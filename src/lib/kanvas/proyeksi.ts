/**
 * Proyeksi lon/lat (+ tinggi) ke piksel layar untuk kanvas 2D di atas peta.
 *
 * Untuk proyeksi globe, titik digambar di atas permukaan: vektor bola satuan dikalikan
 * (1 + tinggi visual) lalu diproyeksikan dengan matriks globe MapLibre. Tinggi visual dikompresi
 * supaya orbit tinggi tetap terlihat "lebih tinggi" tanpa keluar dari pandangan kamera.
 * Di mercator (zoom dekat / mode datar) cukup pakai map.project.
 */

import type { Map as MapLibre } from "maplibre-gl";
import { jarakKm } from "../geo";

export const R_BUMI = 6371.0088;
export const RAD = Math.PI / 180;

export interface Proyektor {
  map: MapLibre;
  globe: boolean;
  M: Float64Array | number[] | null;
  cam: [number, number, number];
  camAlt: number;
  w: number;
  h: number;
}

export interface TitikLayar {
  x: number;
  y: number;
  /** false bila tersembunyi di balik bumi atau di belakang kamera */
  terlihat: boolean;
}

interface TransformInternal {
  getProjectionDataForCustomLayer(applyGlobeMatrix: boolean): { mainMatrix: Float64Array | number[]; projectionTransition: number };
  cameraPosition: [number, number, number] | Float64Array;
  width: number;
  height: number;
}

function transformDari(map: MapLibre): TransformInternal | null {
  const m = map as unknown as { _camera?: { transform?: TransformInternal }; transform?: TransformInternal };
  return m.transform ?? m._camera?.transform ?? null;
}

export function titikKosong(): TitikLayar {
  return { x: 0, y: 0, terlihat: true };
}

/** Tinggi visual (satuan jari-jari bumi) dari tinggi nyata (km), dikompresi relatif terhadap tinggi kamera. */
export function tinggiVisual(altKm: number, camAlt: number): number {
  if (altKm <= 0) return 0;
  const nyata = altKm / R_BUMI;
  const g = 0.14 + 0.5 * Math.min(1, Math.max(0, Math.log(altKm / 300) / Math.log(120)));
  return Math.min(nyata, Math.max(camAlt, 0.002) * g);
}

/** Ambil matriks globe MapLibre untuk frame ini; jatuh ke mercator bila globe belum/tidak aktif. */
export function buatProyektor(map: MapLibre, w: number, h: number): Proyektor {
  const tr = transformDari(map);
  const proj = map.getProjection?.()?.type;
  if (tr && proj === "globe" && typeof tr.getProjectionDataForCustomLayer === "function") {
    try {
      const pd = tr.getProjectionDataForCustomLayer(true);
      if (pd.projectionTransition > 0.999) {
        const cam = tr.cameraPosition;
        const c: [number, number, number] = [cam[0], cam[1], cam[2]];
        return { map, globe: true, M: pd.mainMatrix, cam: c, camAlt: Math.hypot(c[0], c[1], c[2]) - 1, w, h };
      }
    } catch {
      /* jatuh ke mercator */
    }
  }
  return { map, globe: false, M: null, cam: [0, 0, 0], camAlt: 1, w, h };
}

/** Proyeksikan satu titik; hasil ditulis ke `keluar` supaya tidak membuat objek baru tiap frame. */
export function proyeksi(p: Proyektor, lon: number, lat: number, altKm: number, keluar: TitikLayar): boolean {
  if (!p.globe || !p.M) {
    const q = p.map.project([lon, lat]);
    keluar.x = q.x;
    keluar.y = q.y;
    keluar.terlihat = true;
    return Number.isFinite(q.x) && Number.isFinite(q.y);
  }
  const la = lat * RAD;
  const lo = lon * RAD;
  const r = 1 + tinggiVisual(altKm, p.camAlt);
  const cl = Math.cos(la);
  const vx = Math.sin(lo) * cl * r;
  const vy = Math.sin(la) * r;
  const vz = Math.cos(lo) * cl * r;
  const M = p.M;
  const cw = M[3] * vx + M[7] * vy + M[11] * vz + M[15];
  if (cw <= 0) {
    keluar.terlihat = false;
    return false;
  }
  const cx = M[0] * vx + M[4] * vy + M[8] * vz + M[12];
  const cy = M[1] * vx + M[5] * vy + M[9] * vz + M[13];
  keluar.x = ((cx / cw + 1) / 2) * p.w;
  keluar.y = ((1 - cy / cw) / 2) * p.h;
  // tersembunyi di balik bumi? segmen kamera -> titik memotong bola satuan?
  const dx = vx - p.cam[0];
  const dy = vy - p.cam[1];
  const dz = vz - p.cam[2];
  const a = dx * dx + dy * dy + dz * dz;
  const b = 2 * (p.cam[0] * dx + p.cam[1] * dy + p.cam[2] * dz);
  const c = p.cam[0] * p.cam[0] + p.cam[1] * p.cam[1] + p.cam[2] * p.cam[2] - 1;
  const disc = b * b - 4 * a * c;
  let tersembunyi = false;
  if (disc > 0) {
    const t1 = (-b - Math.sqrt(disc)) / (2 * a);
    tersembunyi = t1 > 0 && t1 < 1 - 1e-4;
  }
  keluar.terlihat = !tersembunyi;
  return true;
}

/** Piksel per km di sekitar titik (untuk radius visual minimum). */
export function pikselPerKm(p: Proyektor, lon: number, lat: number): number {
  const a = titikKosong();
  const b = titikKosong();
  const dLat = lat > 80 ? -0.5 : 0.5;
  if (!proyeksi(p, lon, lat, 0, a) || !proyeksi(p, lon, lat + dLat, 0, b)) return 0;
  return Math.hypot(b.x - a.x, b.y - a.y) / jarakKm(lon, lat, lon, lat + dLat);
}

/**
 * Polyline permukaan ke path ctx yang sedang terbuka: dipotong di balik bumi dan pada loncatan
 * garis tanggal (mercator). Mengembalikan true bila ada segmen yang tergambar.
 */
export function garisPermukaan(ctx: CanvasRenderingContext2D, p: Proyektor, titik: [number, number][]): boolean {
  const t = titikKosong();
  let buka = false;
  let ada = false;
  let xLama = 0;
  for (const [lon, lat] of titik) {
    const ok = proyeksi(p, lon, lat, 0, t) && t.terlihat;
    if (!ok) {
      buka = false;
      continue;
    }
    if (buka && Math.abs(t.x - xLama) > p.w * 0.45) buka = false;
    if (!buka) {
      ctx.moveTo(t.x, t.y);
      buka = true;
    } else ctx.lineTo(t.x, t.y);
    ada = true;
    xLama = t.x;
  }
  return ada;
}
