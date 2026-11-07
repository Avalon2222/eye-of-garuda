/**
 * Web Worker: menghitung jadwal lintasan satelit di atas Indonesia untuk beberapa jam ke depan.
 * Dijalankan terpisah dari thread utama supaya globe tetap mulus. Hanya satelit LEO (periode < 130 menit)
 * yang dihitung; satelit GEO/MEO "selalu" atau "tidak pernah" lewat sehingga tidak informatif.
 */

import { twoline2satrec, propagate, gstime, eciToGeodetic, degreesLat, degreesLong } from "satellite.js";

export interface PermintaanLintasan {
  jenis: "hitung";
  satelit: { norad: number; nama: string; negara: string; kelompok: string; l1: string; l2: string }[];
  mulai: number;
  jamKeDepan: number;
  langkahDetik: number;
  kotak: { lonMin: number; lonMax: number; latMin: number; latMax: number };
}

export interface Lintasan {
  norad: number;
  nama: string;
  negara: string;
  kelompok: string;
  masuk: number;
  keluar: number;
  altKm: number;
  /** "S→U" (ke utara) atau "U→S" */
  arah: string;
  /** lon/lat saat masuk dan keluar */
  titikMasuk: [number, number];
  titikKeluar: [number, number];
}

export interface HasilLintasan {
  jenis: "hasil";
  lintasan: Lintasan[];
  sekarang: number[];
  dihitung: number;
  lamaMs: number;
}

const ctx = self as unknown as Worker;

ctx.onmessage = (e: MessageEvent<PermintaanLintasan>) => {
  const q = e.data;
  if (q.jenis !== "hitung") return;
  const t0 = performance.now();
  const hasil: Lintasan[] = [];
  const sekarang: number[] = [];
  const langkah = q.langkahDetik * 1000;
  const akhir = q.mulai + q.jamKeDepan * 3600_000;
  const didalam = (lon: number, lat: number) => lon >= q.kotak.lonMin && lon <= q.kotak.lonMax && lat >= q.kotak.latMin && lat <= q.kotak.latMax;
  // cache GMST per langkah waktu (sama untuk semua satelit)
  const nLangkah = Math.floor((akhir - q.mulai) / langkah);
  const gmst: number[] = new Array(nLangkah + 1);
  for (let i = 0; i <= nLangkah; i++) gmst[i] = gstime(new Date(q.mulai + i * langkah));
  for (const s of q.satelit) {
    let rec;
    try {
      rec = twoline2satrec(s.l1, s.l2);
    } catch {
      continue;
    }
    const periodeMenit = (2 * Math.PI) / rec.no;
    if (!Number.isFinite(periodeMenit) || periodeMenit > 130) continue;
    let dalam = false;
    let masuk = 0;
    let titikMasuk: [number, number] = [0, 0];
    let latMasuk = 0;
    let altSum = 0;
    let nAlt = 0;
    for (let i = 0; i <= nLangkah; i++) {
      const t = q.mulai + i * langkah;
      const pv = propagate(rec, new Date(t));
      if (!pv || typeof pv.position === "boolean" || !pv.position) break;
      const geo = eciToGeodetic(pv.position, gmst[i]);
      const lon = degreesLong(geo.longitude);
      const lat = degreesLat(geo.latitude);
      if (!Number.isFinite(lon) || !Number.isFinite(lat)) break;
      const di = didalam(lon, lat);
      if (di && !dalam) {
        dalam = true;
        masuk = t;
        titikMasuk = [lon, lat];
        latMasuk = lat;
        altSum = 0;
        nAlt = 0;
        if (i === 0) sekarang.push(s.norad);
      }
      if (di) {
        altSum += geo.height;
        nAlt++;
      }
      if (!di && dalam) {
        dalam = false;
        hasil.push({
          norad: s.norad,
          nama: s.nama,
          negara: s.negara,
          kelompok: s.kelompok,
          masuk,
          keluar: t,
          altKm: nAlt ? altSum / nAlt : geo.height,
          arah: lat > latMasuk ? "S→U" : "U→S",
          titikMasuk,
          titikKeluar: [lon, lat],
        });
      }
    }
  }
  hasil.sort((a, b) => a.masuk - b.masuk);
  const pesan: HasilLintasan = { jenis: "hasil", lintasan: hasil, sekarang, dihitung: q.mulai, lamaMs: performance.now() - t0 };
  ctx.postMessage(pesan);
};
