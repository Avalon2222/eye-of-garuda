/**
 * Pelacak pesawat militer. Mengambil data ADS-B lewat /api/pesawat tiap ~10 detik, lalu
 * mengekstrapolasi posisi tiap frame dari kecepatan + haluan supaya ikon meluncur mulus.
 * Saat fix baru datang, selisih posisi prediksi vs fix dihaluskan selama ~1,5 detik.
 */

import type { GeoJSON } from "geojson";
import { titikTujuan } from "../geo";
import { negaraDariHex, kategoriPesawat, type KategoriPesawat } from "../negara";

export interface FixPesawat {
  hex: string;
  callsign: string;
  reg: string;
  tipe: string;
  lat: number;
  lon: number;
  alt: number | null; // kaki
  gs: number | null; // knot
  track: number | null;
  squawk: string;
  dilihat: number; // ms epoch fix
  /** keterangan tipe dari basis data ADS-B (mis. "Boeing P-8A Poseidon") */
  desc?: string;
  /** operator (mis. "United States Navy") bila ada */
  operator?: string;
}

interface StatusPesawat extends FixPesawat {
  koreksiLon: number;
  koreksiLat: number;
  mulaiKoreksi: number;
  jejak: [number, number][];
  negara: string;
  negaraNama: { id: string; en: string };
  kategori: KategoriPesawat;
}

export type CakupanPesawat = "kawasan" | "dunia";

export interface PesawatTampil {
  hex: string;
  callsign: string;
  lon: number;
  lat: number;
  track: number;
  jejak: [number, number][];
  props: Record<string, unknown>;
}


const LAMA_KOREKSI_MS = 1500;
const HAPUS_SETELAH_MS = 150_000;
const MAKS_JEJAK = 40;

export class PelacakPesawat {
  private status = new Map<string, StatusPesawat>();
  terakhirAmbil = 0;
  galat: string | null = null;
  cakupan: CakupanPesawat = "kawasan";

  async ambil(): Promise<void> {
    try {
      const res = await fetch(`/api/pesawat?cakupan=${this.cakupan}`, { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as { now: number; ac: FixPesawat[] };
      this.perbarui(data.ac, Date.now());
      this.terakhirAmbil = Date.now();
      this.galat = null;
    } catch (e) {
      this.galat = e instanceof Error ? e.message : String(e);
    }
  }

  private prediksi(s: StatusPesawat, t: number): [number, number] {
    if (s.gs == null || s.track == null || s.gs < 20) return [s.lon, s.lat];
    const jam = Math.max(0, t - s.dilihat) / 3_600_000;
    return titikTujuan(s.lon, s.lat, s.track, s.gs * 1.852 * jam);
  }

  private posisiTampil(s: StatusPesawat, t: number): [number, number] {
    const [lon, lat] = this.prediksi(s, t);
    const k = Math.min(1, (t - s.mulaiKoreksi) / LAMA_KOREKSI_MS);
    const sisa = 1 - k;
    return [lon + s.koreksiLon * sisa, lat + s.koreksiLat * sisa];
  }

  perbarui(fixes: FixPesawat[], t: number): void {
    const terlihat = new Set<string>();
    for (const f of fixes) {
      terlihat.add(f.hex);
      const lama = this.status.get(f.hex);
      if (!lama) {
        const n = negaraDariHex(f.hex);
        this.status.set(f.hex, {
          ...f,
          koreksiLon: 0,
          koreksiLat: 0,
          mulaiKoreksi: t,
          jejak: [[f.lon, f.lat]],
          negara: n?.kode ?? "???",
          negaraNama: n?.nama ?? { id: "Tidak diketahui", en: "Unknown" },
          kategori: kategoriPesawat(f.tipe, f.desc),
        });
        continue;
      }
      // posisi yang sedang tampil sekarang vs prediksi dari fix baru -> koreksi dihaluskan
      const [tLon, tLat] = this.posisiTampil(lama, t);
      const baru: StatusPesawat = { ...lama, ...f, koreksiLon: 0, koreksiLat: 0, mulaiKoreksi: t };
      if (!lama.tipe && f.tipe) baru.kategori = kategoriPesawat(f.tipe, f.desc);
      const [pLon, pLat] = this.prediksi(baru, t);
      baru.koreksiLon = tLon - pLon;
      baru.koreksiLat = tLat - pLat;
      if (Math.abs(baru.koreksiLon) > 2 || Math.abs(baru.koreksiLat) > 2) {
        baru.koreksiLon = 0;
        baru.koreksiLat = 0;
      }
      const akhir = lama.jejak[lama.jejak.length - 1];
      if (!akhir || Math.abs(akhir[0] - f.lon) > 1e-4 || Math.abs(akhir[1] - f.lat) > 1e-4) {
        const titikBaru: [number, number] = [f.lon, f.lat];
        baru.jejak = [...lama.jejak, titikBaru].slice(-MAKS_JEJAK);
      }
      this.status.set(f.hex, baru);
    }
    for (const [hex, s] of this.status) {
      if (!terlihat.has(hex) && t - s.dilihat > HAPUS_SETELAH_MS) this.status.delete(hex);
    }
  }

  get jumlah(): number {
    return this.status.size;
  }

  cari(hex: string): StatusPesawat | undefined {
    return this.status.get(hex);
  }

  /** Daftar pesawat dengan posisi terekstrapolasi untuk digambar di kanvas. */
  daftar(t: number): PesawatTampil[] {
    const hasil: PesawatTampil[] = [];
    for (const s of this.status.values()) {
      const [lon, lat] = this.posisiTampil(s, t);
      const callsign = s.callsign || s.reg || s.hex.toUpperCase();
      hasil.push({
        hex: s.hex,
        callsign,
        lon,
        lat,
        track: s.track ?? 0,
        jejak: s.jejak,
        props: {
          id: `pesawat-${s.hex}`,
          hex: s.hex,
          callsign,
          /** label peta: "CALLSIGN (USA)", sama dengan gaya satelit */
          label: `${callsign} (${s.negara})`,
          nama: `${callsign} (${s.negara})`,
          reg: s.reg,
          tipe: s.tipe,
          desc: s.desc ?? "",
          operator: s.operator ?? "",
          kategori: s.kategori,
          negara: s.negara,
          negara_id: s.negaraNama.id,
          negara_en: s.negaraNama.en,
          alt: s.alt,
          gs: s.gs,
          track: s.track ?? 0,
          squawk: s.squawk,
          dilihat: s.dilihat,
          lon,
          lat,
        },
      });
    }
    return hasil;
  }

  /** Jumlah per kategori (untuk legenda/ticker). */
  perKategori(): Partial<Record<KategoriPesawat, number>> {
    const h: Partial<Record<KategoriPesawat, number>> = {};
    for (const s of this.status.values()) h[s.kategori] = (h[s.kategori] ?? 0) + 1;
    return h;
  }

  /** GeoJSON titik (dengan posisi terekstrapolasi) dan jejak untuk waktu t. */
  hitung(t: number): { titik: GeoJSON.FeatureCollection; jejak: GeoJSON.FeatureCollection } {
    const titik: GeoJSON.Feature[] = [];
    const jejak: GeoJSON.Feature[] = [];
    for (const s of this.status.values()) {
      const [lon, lat] = this.posisiTampil(s, t);
      titik.push({
        type: "Feature",
        properties: {
          id: `pesawat-${s.hex}`,
          hex: s.hex,
          callsign: s.callsign || s.reg || s.hex.toUpperCase(),
          reg: s.reg,
          tipe: s.tipe,
          alt: s.alt,
          gs: s.gs,
          track: s.track ?? 0,
          squawk: s.squawk,
          dilihat: s.dilihat,
          lon,
          lat,
        },
        geometry: { type: "Point", coordinates: [lon, lat] },
      });
      if (s.jejak.length > 1) {
        jejak.push({
          type: "Feature",
          properties: { hex: s.hex },
          geometry: { type: "LineString", coordinates: [...s.jejak, [lon, lat]] },
        });
      }
    }
    return { titik: { type: "FeatureCollection", features: titik }, jejak: { type: "FeatureCollection", features: jejak } };
  }
}
