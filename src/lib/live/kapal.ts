/**
 * Kapal dari snapshot AIS (scripts/ambil_ais.py, GitHub Actions tiap ~30 menit, cabang `data`).
 * Posisi diekstrapolasi dari haluan (COG) dan kecepatan (SOG) sejak waktu laporan terakhir.
 */

import type { GeoJSON } from "geojson";
import { titikTujuan } from "../geo";

export interface KapalSnapshot {
  mmsi: number;
  nama: string;
  lat: number;
  lon: number;
  cog: number | null;
  sog: number | null;
  heading: number | null;
  tipe: number | null;
  kelas: string;
  tujuan: string;
  bendera: string;
  waktu: string; // ISO
  tersanksi: boolean;
  program?: string;
}

export interface SnapshotAis {
  diambil: string;
  durasi_detik: number;
  kotak: number[];
  jumlah: number;
  kapal: KapalSnapshot[];
}

export const URL_SNAPSHOT_RAW = "https://raw.githubusercontent.com/Avalon2222/eye-of-garuda/data/kapal.json";
const MAKS_EKSTRAPOLASI_MENIT = 90;

export class PelacakKapal {
  snapshot: SnapshotAis | null = null;
  galat: string | null = null;
  private waktuMs = new Map<number, number>();

  async muat(): Promise<void> {
    for (const url of [URL_SNAPSHOT_RAW, "/data/kapal.json"]) {
      try {
        const res = await fetch(url, { cache: "no-store" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const s = (await res.json()) as SnapshotAis;
        if (!Array.isArray(s.kapal)) throw new Error("format snapshot tidak dikenal");
        this.snapshot = s;
        this.waktuMs.clear();
        for (const k of s.kapal) this.waktuMs.set(k.mmsi, Date.parse(k.waktu));
        this.galat = null;
        return;
      } catch (e) {
        this.galat = e instanceof Error ? e.message : String(e);
      }
    }
  }

  get jumlah(): number {
    return this.snapshot?.kapal.length ?? 0;
  }

  /** Menit sejak snapshot diambil. */
  umurMenit(t: number): number | null {
    if (!this.snapshot || this.snapshot.kapal.length === 0) return null;
    return Math.max(0, Math.round((t - Date.parse(this.snapshot.diambil)) / 60000));
  }

  cari(mmsi: number): KapalSnapshot | undefined {
    return this.snapshot?.kapal.find((k) => k.mmsi === mmsi);
  }

  posisi(k: KapalSnapshot, t: number): [number, number] {
    const t0 = this.waktuMs.get(k.mmsi) ?? t;
    if (k.sog == null || k.cog == null || k.sog < 0.5) return [k.lon, k.lat];
    const menit = Math.min(MAKS_EKSTRAPOLASI_MENIT, Math.max(0, (t - t0) / 60000));
    return titikTujuan(k.lon, k.lat, k.cog, k.sog * 1.852 * (menit / 60));
  }

  hitung(t: number): GeoJSON.FeatureCollection {
    if (!this.snapshot) return { type: "FeatureCollection", features: [] };
    const fitur: GeoJSON.Feature[] = this.snapshot.kapal.map((k) => {
      const [lon, lat] = this.posisi(k, t);
      return {
        type: "Feature",
        properties: {
          id: `kapal-${k.mmsi}`,
          mmsi: k.mmsi,
          nama: k.nama || String(k.mmsi),
          kelas: k.kelas,
          tipe: k.tipe,
          sog: k.sog,
          cog: k.cog,
          arah: k.heading != null && k.heading < 360 ? k.heading : (k.cog ?? 0),
          tujuan: k.tujuan,
          bendera: k.bendera,
          waktu: k.waktu,
          tersanksi: k.tersanksi,
          program: k.program ?? "",
          lon,
          lat,
        },
        geometry: { type: "Point", coordinates: [lon, lat] },
      };
    });
    return { type: "FeatureCollection", features: fitur };
  }
}
