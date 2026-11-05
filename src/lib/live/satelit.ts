/**
 * Propagasi satelit dari TLE di browser (SGP4 via satellite.js).
 * Katalog: public/data/satelit.json (dibangun oleh scripts/bangun_satelit.py), diperbarui harian
 * di cabang `data` dan dibaca lewat raw.githubusercontent.com bila tersedia.
 */

import type { GeoJSON } from "geojson";
import { twoline2satrec, propagate, gstime, eciToGeodetic, degreesLat, degreesLong, type SatRec } from "satellite.js";

export interface KatalogSatelit {
  dibangun: string;
  epoch_tle: string;
  jumlah: number;
  satelit: {
    norad: number;
    nama: string;
    negara: string;
    kelompok: string;
    misi: string;
    operator: string;
    diluncurkan: string;
    l1: string;
    l2: string;
  }[];
}

interface SatAktif {
  meta: KatalogSatelit["satelit"][number];
  rec: SatRec;
}

export const URL_KATALOG_RAW = "https://raw.githubusercontent.com/Avalon2222/eye-of-garuda/data/satelit.json";

export class PelacakSatelit {
  private daftar: SatAktif[] = [];
  katalog: KatalogSatelit | null = null;
  galat: string | null = null;

  async muat(): Promise<void> {
    const sumber = [URL_KATALOG_RAW, "/data/satelit.json"];
    for (const url of sumber) {
      try {
        const res = await fetch(url, { cache: "no-store" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const k = (await res.json()) as KatalogSatelit;
        this.katalog = k;
        this.daftar = [];
        for (const s of k.satelit) {
          try {
            const rec = twoline2satrec(s.l1, s.l2);
            this.daftar.push({ meta: s, rec });
          } catch {
            /* TLE rusak, lewati */
          }
        }
        this.galat = null;
        return;
      } catch (e) {
        this.galat = e instanceof Error ? e.message : String(e);
      }
    }
  }

  get jumlah(): number {
    return this.daftar.length;
  }

  cari(norad: number): SatAktif | undefined {
    return this.daftar.find((s) => s.meta.norad === norad);
  }

  /** Posisi geodetik satu satelit pada waktu t, atau null bila propagasi gagal. */
  posisi(s: SatAktif, t: Date): { lon: number; lat: number; alt: number } | null {
    const pv = propagate(s.rec, t);
    if (!pv || typeof pv.position === "boolean" || !pv.position) return null;
    const g = eciToGeodetic(pv.position, gstime(t));
    return { lon: degreesLong(g.longitude), lat: degreesLat(g.latitude), alt: g.height };
  }

  hitung(t: Date): GeoJSON.FeatureCollection {
    const fitur: GeoJSON.Feature[] = [];
    for (const s of this.daftar) {
      const p = this.posisi(s, t);
      if (!p || !Number.isFinite(p.lon) || !Number.isFinite(p.lat)) continue;
      fitur.push({
        type: "Feature",
        properties: {
          id: `satelit-${s.meta.norad}`,
          norad: s.meta.norad,
          nama: s.meta.nama,
          negara: s.meta.negara,
          kelompok: s.meta.kelompok,
          misi: s.meta.misi,
          operator: s.meta.operator,
          diluncurkan: s.meta.diluncurkan,
          alt: Math.round(p.alt),
          lon: p.lon,
          lat: p.lat,
        },
        geometry: { type: "Point", coordinates: [p.lon, p.lat] },
      });
    }
    return { type: "FeatureCollection", features: fitur };
  }

  /** Lintasan ±menit di sekitar t, dipotong di garis tanggal. */
  lintasan(norad: number, t: Date, menit = 45, langkahDetik = 30): GeoJSON.FeatureCollection {
    const s = this.cari(norad);
    if (!s) return { type: "FeatureCollection", features: [] };
    const segmen: [number, number][][] = [[]];
    for (let d = -menit * 60; d <= menit * 60; d += langkahDetik) {
      const p = this.posisi(s, new Date(t.getTime() + d * 1000));
      if (!p) continue;
      const seg = segmen[segmen.length - 1];
      const akhir = seg[seg.length - 1];
      if (akhir && Math.abs(akhir[0] - p.lon) > 180) segmen.push([[p.lon, p.lat]]);
      else seg.push([p.lon, p.lat]);
    }
    return {
      type: "FeatureCollection",
      features: segmen.filter((g) => g.length > 1).map((g) => ({ type: "Feature", properties: { norad }, geometry: { type: "LineString", coordinates: g } })),
    };
  }
}
