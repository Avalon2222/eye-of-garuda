/** Format tanggal dan umur untuk panel detail (epoch TLE, dll). */

import { terjemah, type Lang } from "./i18n";

/**
 * Epoch TLE (kolom 19–32 baris 1, format YYDDD.ffffffff) ke Date UTC.
 * Tahun 57–99 = 1900-an, 00–56 = 2000-an (aturan NORAD).
 */
export function tanggalEpochTle(epoch: string): Date | null {
  const m = /^(\d{2})(\d{3}(?:\.\d+)?)$/.exec(epoch.trim());
  if (!m) return null;
  const yy = Number(m[1]);
  const hari = Number(m[2]);
  if (!Number.isFinite(hari) || hari < 1 || hari >= 367) return null;
  const tahun = yy < 57 ? 2000 + yy : 1900 + yy;
  return new Date(Date.UTC(tahun, 0, 1) + (hari - 1) * 86_400_000);
}

/** "11 Nov 2026" (UTC). */
export function formatTanggal(d: Date, lang: Lang): string {
  return d.toLocaleDateString(lang === "id" ? "id-ID" : "en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).replace(/\./g, "");
}

/** "3 jam lalu", "1 hari lalu", "2 days ago". */
export function formatUmur(ms: number, lang: Lang): string {
  const menit = Math.max(0, Math.round(ms / 60_000));
  if (menit < 60) return terjemah(lang, "age_min", { n: menit });
  const jam = Math.round(menit / 60);
  if (jam < 24) return terjemah(lang, "age_hour", { n: jam });
  const hari = Math.round(jam / 24);
  return terjemah(lang, hari === 1 ? "age_day" : "age_days", { n: hari });
}

/** Epoch TLE mentah ke "11 Nov 2026, 1 hari lalu"; kalau formatnya aneh, kembalikan apa adanya. */
export function formatEpochTle(epoch: string, lang: Lang, sekarang = Date.now()): string {
  const d = tanggalEpochTle(epoch);
  if (!d) return epoch;
  return `${formatTanggal(d, lang)}, ${formatUmur(sekarang - d.getTime(), lang)}`;
}
