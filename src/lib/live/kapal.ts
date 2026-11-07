/**
 * Kapal dari AIS: dua sumber digabung.
 *  1. Snapshot (scripts/ambil_ais.py, GitHub Actions tiap ~30 menit, cabang `data`): cakupan luas.
 *  2. Live (/api/kapal, aisstream.io lewat server, tiap ±60 detik): posisi segar untuk kapal yang
 *     sedang memancar. Kalau rute live tidak tersedia (kunci belum dipasang), hanya snapshot yang dipakai.
 * Posisi diekstrapolasi dari haluan (COG) dan kecepatan (SOG) sejak waktu laporan terakhir.
 */

import type { GeoJSON } from "geojson";
import { titikTujuan } from "../geo";
import { negaraDariMmsi } from "../negara";

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
  /** "live" bila dari aisstream langsung, "snapshot" bila dari berkas 30 menit */
  sumber?: "live" | "snapshot";
}

export interface SnapshotAis {
  diambil: string;
  durasi_detik: number;
  kotak?: number[];
  jumlah: number;
  kapal: KapalSnapshot[];
  sumber?: string;
}

export const URL_SNAPSHOT_RAW = "https://raw.githubusercontent.com/Avalon2222/eye-of-garuda/data/kapal.json";
const MAKS_EKSTRAPOLASI_MENIT = 90;

export class PelacakKapal {
  snapshot: SnapshotAis | null = null;
  live: SnapshotAis | null = null;
  galat: string | null = null;
  /** null = belum dicoba, false = rute live tidak tersedia (kunci belum dipasang) */
  liveTersedia: boolean | null = null;
  private gabungan = new Map<number, KapalSnapshot>();
  private waktuMs = new Map<number, number>();

  async muat(): Promise<void> {
    for (const url of [URL_SNAPSHOT_RAW, "/data/kapal.json"]) {
      try {
        const res = await fetch(url, { cache: "no-store" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const s = (await res.json()) as SnapshotAis;
        if (!Array.isArray(s.kapal)) throw new Error("format snapshot tidak dikenal");
        this.snapshot = s;
        this.galat = null;
        this.gabung();
        return;
      } catch (e) {
        this.galat = e instanceof Error ? e.message : String(e);
      }
    }
  }

  /** Ambil posisi live dari /api/kapal. Diam-diam menyerah bila rute membalas 503 (kunci belum ada). */
  async muatLive(): Promise<void> {
    if (this.liveTersedia === false) return;
    try {
      const res = await fetch("/api/kapal", { cache: "no-store" });
      if (res.status === 503) {
        this.liveTersedia = false;
        return;
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const s = (await res.json()) as SnapshotAis;
      if (!Array.isArray(s.kapal)) throw new Error("format live tidak dikenal");
      this.live = s;
      this.liveTersedia = true;
      this.gabung();
    } catch {
      /* biarkan snapshot yang bekerja */
    }
  }

  private gabung(): void {
    this.gabungan.clear();
    this.waktuMs.clear();
    for (const k of this.snapshot?.kapal ?? []) {
      this.gabungan.set(k.mmsi, { ...k, sumber: "snapshot" });
    }
    for (const k of this.live?.kapal ?? []) {
      const lama = this.gabungan.get(k.mmsi);
      this.gabungan.set(k.mmsi, {
        ...(lama ?? {}),
        ...k,
        nama: k.nama || lama?.nama || "",
        tipe: k.tipe ?? lama?.tipe ?? null,
        kelas: k.tipe != null || !lama ? k.kelas : lama.kelas,
        tujuan: k.tujuan || lama?.tujuan || "",
        bendera: k.bendera || lama?.bendera || "",
        tersanksi: lama?.tersanksi ?? k.tersanksi,
        program: lama?.program,
        sumber: "live",
      });
    }
    for (const k of this.gabungan.values()) {
      if (!k.bendera) k.bendera = negaraDariMmsi(k.mmsi)?.nama.id ?? "";
      this.waktuMs.set(k.mmsi, Date.parse(k.waktu));
    }
  }

  get jumlah(): number {
    return this.gabungan.size;
  }

  get jumlahLive(): number {
    return this.live?.kapal.length ?? 0;
  }

  /** Menit sejak data terbaru (live bila ada, kalau tidak snapshot). */
  umurMenit(t: number): number | null {
    const acuan = this.live?.diambil ?? this.snapshot?.diambil;
    if (!acuan || this.gabungan.size === 0) return null;
    return Math.max(0, Math.round((t - Date.parse(acuan)) / 60000));
  }

  cari(mmsi: number): KapalSnapshot | undefined {
    return this.gabungan.get(mmsi);
  }

  posisi(k: KapalSnapshot, t: number): [number, number] {
    const t0 = this.waktuMs.get(k.mmsi) ?? t;
    if (k.sog == null || k.cog == null || k.sog < 0.5) return [k.lon, k.lat];
    const menit = Math.min(MAKS_EKSTRAPOLASI_MENIT, Math.max(0, (t - t0) / 60000));
    return titikTujuan(k.lon, k.lat, k.cog, k.sog * 1.852 * (menit / 60));
  }

  hitung(t: number): GeoJSON.FeatureCollection {
    const fitur: GeoJSON.Feature[] = [];
    for (const k of this.gabungan.values()) {
      const [lon, lat] = this.posisi(k, t);
      const kode = negaraDariMmsi(k.mmsi)?.kode ?? "";
      const nama = k.nama || String(k.mmsi);
      fitur.push({
        type: "Feature",
        properties: {
          id: `kapal-${k.mmsi}`,
          mmsi: k.mmsi,
          nama,
          label: kode ? `${nama} (${kode})` : nama,
          negara: kode,
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
          sumber: k.sumber ?? "snapshot",
          lon,
          lat,
        },
        geometry: { type: "Point", coordinates: [lon, lat] },
      });
    }
    return { type: "FeatureCollection", features: fitur };
  }
}
