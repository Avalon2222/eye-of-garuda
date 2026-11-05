/**
 * Proxy ADS-B militer. Sumber utama api.adsb.lol/v2/mil (gratis, tanpa kunci), cadangan api.airplanes.live.
 * Hasil disaring ke kawasan Indo-Pasifik (default) atau seluruh dunia, lalu dicache ~8 detik.
 */

import { NextResponse } from "next/server";

const SUMBER = ["https://api.adsb.lol/v2/mil", "https://api.airplanes.live/v2/mil"];
const KAWASAN = { latMin: -50, latMax: 50, lonMin: 60, lonMax: 180 };
const CACHE_MS = 8000;

interface AcMentah {
  hex: string;
  flight?: string;
  r?: string;
  t?: string;
  lat?: number;
  lon?: number;
  alt_baro?: number | string;
  alt_geom?: number;
  gs?: number;
  track?: number;
  true_heading?: number;
  squawk?: string;
  seen_pos?: number;
}

let cache: { waktu: number; ac: AcMentah[] } | null = null;

async function ambilMentah(): Promise<AcMentah[]> {
  if (cache && Date.now() - cache.waktu < CACHE_MS) return cache.ac;
  let galatTerakhir: unknown = null;
  for (const url of SUMBER) {
    try {
      const res = await fetch(url, { headers: { Accept: "application/json" }, signal: AbortSignal.timeout(9000), cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status} dari ${url}`);
      const data = (await res.json()) as { ac?: AcMentah[] };
      const ac = (data.ac ?? []).filter((a) => typeof a.lat === "number" && typeof a.lon === "number");
      cache = { waktu: Date.now(), ac };
      return ac;
    } catch (e) {
      galatTerakhir = e;
    }
  }
  if (cache) return cache.ac;
  throw galatTerakhir instanceof Error ? galatTerakhir : new Error("Sumber ADS-B tidak terjangkau");
}

export async function GET(req: Request) {
  const cakupan = new URL(req.url).searchParams.get("cakupan") ?? "kawasan";
  try {
    const sekarang = Date.now();
    const semua = await ambilMentah();
    const dipilih = semua.filter((a) => {
      if (cakupan === "dunia") return true;
      return a.lat! >= KAWASAN.latMin && a.lat! <= KAWASAN.latMax && a.lon! >= KAWASAN.lonMin && a.lon! <= KAWASAN.lonMax;
    });
    const ac = dipilih.map((a) => ({
      hex: a.hex,
      callsign: (a.flight ?? "").trim(),
      reg: a.r ?? "",
      tipe: a.t ?? "",
      lat: a.lat!,
      lon: a.lon!,
      alt: typeof a.alt_baro === "number" ? a.alt_baro : typeof a.alt_geom === "number" ? a.alt_geom : null,
      gs: typeof a.gs === "number" ? a.gs : null,
      track: typeof a.track === "number" ? a.track : typeof a.true_heading === "number" ? a.true_heading : null,
      squawk: a.squawk ?? "",
      dilihat: sekarang - Math.round((a.seen_pos ?? 0) * 1000),
    }));
    return NextResponse.json(
      { now: sekarang, total_dunia: semua.length, cakupan, ac },
      { headers: { "Cache-Control": "public, max-age=5, s-maxage=8" } },
    );
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "gagal" }, { status: 502 });
  }
}
