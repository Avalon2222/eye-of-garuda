/**
 * Propagasi satelit dari TLE di browser (SGP4 via satellite.js).
 * Katalog: public/data/satelit.json (dibangun oleh scripts/bangun_satelit.py), diperbarui harian
 * di cabang `data` dan dibaca lewat raw.githubusercontent.com bila tersedia.
 *
 * Supaya ringan: tiap satelit dipropagasi SGP4 penuh hanya sekitar sekali per detik (bergiliran),
 * di antaranya posisinya diekstrapolasi linier dari vektor kecepatan ECI. Hasilnya semua satelit
 * bergerak mulus tiap frame tanpa membebani CPU.
 */

import { twoline2satrec, propagate, gstime, eciToGeodetic, degreesLat, degreesLong, type SatRec } from "satellite.js";

export interface MetaSatelit {
  norad: number;
  nama: string;
  negara: string;
  kelompok: string;
  misi: string;
  operator: string;
  diluncurkan: string;
  l1: string;
  l2: string;
}

export interface KatalogSatelit {
  dibangun: string;
  epoch_tle: string;
  jumlah: number;
  satelit: MetaSatelit[];
}

export interface PosisiSatelit {
  lon: number;
  lat: number;
  /** km di atas permukaan */
  alt: number;
  /** km/s */
  kecepatan: number;
}

export interface SatAktif {
  meta: MetaSatelit;
  rec: SatRec;
  /** fix ECI terakhir (km, km/s) */
  t0: number;
  p: [number, number, number];
  v: [number, number, number];
  /** posisi geodetik hasil hitung terakhir */
  pos: PosisiSatelit | null;
  gagal: boolean;
}

export type KelasOrbit = "LEO" | "MEO" | "GEO" | "HEO";

export const URL_KATALOG_RAW = "https://raw.githubusercontent.com/Avalon2222/eye-of-garuda/data/satelit.json";

const KODE_NEGARA: Record<string, string> = {
  "Amerika Serikat": "USA",
  China: "CHN",
  Rusia: "RUS",
  India: "IND",
  "Korea Selatan": "KOR",
  "Korea Utara": "PRK",
  Indonesia: "IDN",
  Spanyol: "ESP",
  Iran: "IRN",
  Pakistan: "PAK",
  Australia: "AUS",
  Turki: "TUR",
  Israel: "ISR",
  Jepang: "JPN",
  Prancis: "FRA",
  Jerman: "DEU",
  Italia: "ITA",
  Inggris: "GBR",
  "Uni Emirat Arab": "UAE",
  "Arab Saudi": "SAU",
  Mesir: "EGY",
  Brasil: "BRA",
  Kanada: "CAN",
  Taiwan: "TWN",
  Singapura: "SGP",
  Malaysia: "MYS",
  Thailand: "THA",
  Vietnam: "VNM",
  Filipina: "PHL",
  Luksemburg: "LUX",
  Belanda: "NLD",
  Norwegia: "NOR",
  Ukraina: "UKR",
  Eropa: "ESA",
  Internasional: "INT",
};

export function kodeNegara(negara: string): string {
  if (KODE_NEGARA[negara]) return KODE_NEGARA[negara];
  const bersih = negara.replace(/[^A-Za-z ]/g, "").trim();
  if (!bersih) return "???";
  const kata = bersih.split(/\s+/);
  if (kata.length >= 2) return kata.map((k) => k[0]).join("").toUpperCase().slice(0, 3).padEnd(3, kata[0][1]?.toUpperCase() ?? "X");
  return bersih.slice(0, 3).toUpperCase();
}

/** Nama tampilan: "NAMA (USA)" */
export function namaSatelit(m: MetaSatelit): string {
  return `${m.nama.replace(/\s*\(.*?\)\s*$/, "")} (${kodeNegara(m.negara)})`;
}

export function kelasOrbit(altKm: number, ecc: number, inklinasiDeg: number): KelasOrbit {
  if (ecc > 0.25) return "HEO";
  if (altKm < 2000) return "LEO";
  if (altKm > 35000 && altKm < 36600 && inklinasiDeg < 20) return "GEO";
  if (altKm >= 35000 && altKm < 36600) return "GEO";
  return "MEO";
}

export const WARNA_KELOMPOK: Record<string, string> = {
  "Militer asing": "#ff4d4d",
  "Pengintai sipil & komersial asing": "#f2c66d",
  Indonesia: "#4ade80",
};

export function warnaSatelit(kelompok: string): string {
  return WARNA_KELOMPOK[kelompok] ?? "#94a3b8";
}

const R_BUMI = 6371.0088;

export class PelacakSatelit {
  daftar: SatAktif[] = [];
  katalog: KatalogSatelit | null = null;
  galat: string | null = null;
  private giliran = 0;
  private gmstCache = { t: 0, g: 0 };

  async muat(): Promise<void> {
    const sumber = [URL_KATALOG_RAW, "/data/satelit.json"];
    for (const url of sumber) {
      try {
        const res = await fetch(url, { cache: "no-store" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const k = (await res.json()) as KatalogSatelit;
        this.katalog = k;
        this.daftar = [];
        const now = Date.now();
        for (const s of k.satelit) {
          try {
            const rec = twoline2satrec(s.l1, s.l2);
            const a: SatAktif = { meta: s, rec, t0: 0, p: [0, 0, 0], v: [0, 0, 0], pos: null, gagal: false };
            this.propagasi(a, now);
            this.daftar.push(a);
          } catch {
            /* TLE rusak, lewati */
          }
        }
        // satelit yang gagal dipropagasi (TLE kedaluwarsa / decay) dibuang
        this.daftar = this.daftar.filter((a) => !a.gagal);
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

  private gmst(t: number): number {
    if (Math.abs(t - this.gmstCache.t) > 200) this.gmstCache = { t, g: gstime(new Date(t)) };
    return this.gmstCache.g;
  }

  /** Propagasi SGP4 penuh untuk satu satelit pada waktu t (ms epoch). */
  private propagasi(a: SatAktif, t: number): boolean {
    const pv = propagate(a.rec, new Date(t));
    if (!pv || typeof pv.position === "boolean" || !pv.position || typeof pv.velocity === "boolean" || !pv.velocity) {
      a.gagal = true;
      return false;
    }
    const { x, y, z } = pv.position;
    const v = pv.velocity;
    if (![x, y, z, v.x, v.y, v.z].every(Number.isFinite)) {
      a.gagal = true;
      return false;
    }
    a.t0 = t;
    a.p = [x, y, z];
    a.v = [v.x, v.y, v.z];
    a.gagal = false;
    return true;
  }

  /** Propagasi penuh untuk n satelit berikutnya (bergiliran). */
  perbaruiSebagian(t: number, n = 16): void {
    const total = this.daftar.length;
    if (!total) return;
    for (let i = 0; i < Math.min(n, total); i++) {
      this.giliran = (this.giliran + 1) % total;
      this.propagasi(this.daftar[this.giliran], t);
    }
  }

  /** Posisi geodetik semua satelit pada waktu t (ekstrapolasi linier dari fix ECI terakhir). */
  posisiSemua(t: number): void {
    const g = this.gmst(t);
    for (const a of this.daftar) {
      if (a.gagal) {
        a.pos = null;
        continue;
      }
      const dt = (t - a.t0) / 1000;
      const px = a.p[0] + a.v[0] * dt;
      const py = a.p[1] + a.v[1] * dt;
      const pz = a.p[2] + a.v[2] * dt;
      const geo = eciToGeodetic({ x: px, y: py, z: pz }, g);
      const lon = degreesLong(geo.longitude);
      const lat = degreesLat(geo.latitude);
      if (!Number.isFinite(lon) || !Number.isFinite(lat)) {
        a.pos = null;
        continue;
      }
      const kec = Math.hypot(a.v[0], a.v[1], a.v[2]);
      if (a.pos) {
        a.pos.lon = lon;
        a.pos.lat = lat;
        a.pos.alt = geo.height;
        a.pos.kecepatan = kec;
      } else a.pos = { lon, lat, alt: geo.height, kecepatan: kec };
    }
  }

  /** Posisi geodetik satu satelit pada waktu t (propagasi penuh, untuk lintasan). */
  posisiPada(a: SatAktif, t: number): PosisiSatelit | null {
    const pv = propagate(a.rec, new Date(t));
    if (!pv || typeof pv.position === "boolean" || !pv.position || typeof pv.velocity === "boolean" || !pv.velocity) return null;
    const geo = eciToGeodetic(pv.position, gstime(new Date(t)));
    const lon = degreesLong(geo.longitude);
    const lat = degreesLat(geo.latitude);
    if (!Number.isFinite(lon) || !Number.isFinite(lat)) return null;
    return { lon, lat, alt: geo.height, kecepatan: Math.hypot(pv.velocity.x, pv.velocity.y, pv.velocity.z) };
  }

  /** Periode orbit (menit) dari mean motion TLE. */
  periodeMenit(a: SatAktif): number {
    return (2 * Math.PI) / a.rec.no;
  }

  inklinasiDeg(a: SatAktif): number {
    return (a.rec.inclo * 180) / Math.PI;
  }

  /** Keterangan lengkap untuk panel detail. */
  info(a: SatAktif): Record<string, unknown> {
    const pos = a.pos;
    const alt = pos?.alt ?? 0;
    const ecc = a.rec.ecco;
    const ink = this.inklinasiDeg(a);
    const periode = this.periodeMenit(a);
    // apogee / perigee dari sumbu semi-mayor (km)
    const n = a.rec.no / 60; // rad/s
    const mu = 398600.4418;
    const sma = Math.cbrt(mu / (n * n));
    const apogee = sma * (1 + ecc) - R_BUMI;
    const perigee = sma * (1 - ecc) - R_BUMI;
    return {
      id: `satelit-${a.meta.norad}`,
      norad: a.meta.norad,
      nama: namaSatelit(a.meta),
      nama_asli: a.meta.nama,
      negara: a.meta.negara,
      kode_negara: kodeNegara(a.meta.negara),
      kelompok: a.meta.kelompok,
      misi: a.meta.misi,
      operator: a.meta.operator,
      diluncurkan: a.meta.diluncurkan,
      kelas_orbit: kelasOrbit(alt, ecc, ink),
      alt: Math.round(alt),
      kecepatan: pos ? Number(pos.kecepatan.toFixed(2)) : null,
      periode_menit: Number(periode.toFixed(1)),
      inklinasi: Number(ink.toFixed(1)),
      eksentrisitas: Number(ecc.toFixed(4)),
      apogee: Math.round(apogee),
      perigee: Math.round(perigee),
      epoch: a.meta.l1.slice(18, 32).trim(),
      lon: pos?.lon ?? 0,
      lat: pos?.lat ?? 0,
    };
  }

  /**
   * Lintasan satu orbit penuh di sekitar t (setengah periode ke belakang, setengah ke depan),
   * dengan ketinggian, untuk digambar di kanvas. Dipotong di garis tanggal oleh penggambar.
   */
  lintasanPenuh(a: SatAktif, t: number, maksTitik = 360): PosisiSatelit[] {
    const periodeMs = this.periodeMenit(a) * 60_000;
    const langkah = Math.max(10_000, periodeMs / maksTitik);
    const titik: PosisiSatelit[] = [];
    for (let d = -periodeMs / 2; d <= periodeMs / 2; d += langkah) {
      const p = this.posisiPada(a, t + d);
      if (p) titik.push(p);
    }
    return titik;
  }
}
