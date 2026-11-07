/**
 * Live AIS: membuka WebSocket ke aisstream.io selama beberapa detik, mengumpulkan posisi kapal di kawasan,
 * lalu mengembalikannya dalam format yang sama dengan snapshot (kapal.json). Dicache ±45 detik supaya
 * satu koneksi melayani semua pengunjung. Kunci dibaca dari variabel lingkungan AISSTREAM_API_KEY
 * (di Vercel: Settings → Environment Variables). Tanpa kunci, rute ini membalas 503 dan browser
 * memakai snapshot 30 menit saja.
 */

import { NextResponse, connection } from "next/server";

const URL_WS = "wss://stream.aisstream.io/v0/stream";
const KOTAK = [[[-13.0, 92.0], [12.0, 145.0]]];
const LAMA_SIMAK_MS = 7000;
const CACHE_MS = 45_000;

interface KapalLive {
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
  waktu: string;
  tersanksi: boolean;
}

interface PesanAis {
  MessageType: string;
  MetaData?: { MMSI?: number; ShipName?: string; latitude?: number; longitude?: number; time_utc?: string };
  Message?: {
    PositionReport?: { Cog?: number; Sog?: number; TrueHeading?: number; Latitude?: number; Longitude?: number };
    StandardClassBPositionReport?: { Cog?: number; Sog?: number; TrueHeading?: number; Latitude?: number; Longitude?: number };
    ShipStaticData?: { Type?: number; Destination?: string; Name?: string };
  };
}

function kelasDariTipe(tipe: number | null): string {
  if (tipe == null) return "lainnya";
  if (tipe === 35) return "militer";
  if (tipe === 55) return "patroli";
  if (tipe === 51) return "sar";
  if (tipe === 30) return "nelayan";
  if (tipe >= 80 && tipe <= 89) return "tanker";
  if (tipe >= 70 && tipe <= 79) return "kargo";
  if (tipe >= 60 && tipe <= 69) return "penumpang";
  return "lainnya";
}

let cache: { waktu: number; kapal: KapalLive[]; diambil: string } | null = null;
let sedang: Promise<KapalLive[]> | null = null;
/** pesan galat dari aisstream (mis. kunci tidak valid), ikut dikirim ke browser untuk diagnosis */
let galatServer: string | null = null;

function simak(kunci: string): Promise<KapalLive[]> {
  return new Promise((resolve, reject) => {
    const WS = (globalThis as unknown as { WebSocket?: typeof WebSocket }).WebSocket;
    if (!WS) {
      reject(new Error("WebSocket tidak tersedia di runtime ini"));
      return;
    }
    const kapal = new Map<number, KapalLive>();
    galatServer = null;
    const statis = new Map<number, { tipe: number | null; tujuan: string; nama: string }>();
    let ws: WebSocket;
    try {
      ws = new WS(URL_WS);
    } catch (e) {
      reject(e);
      return;
    }
    const selesai = (galat?: Error) => {
      clearTimeout(idTimer);
      try {
        ws.close();
      } catch {
        /* abaikan */
      }
      if (galat && kapal.size === 0) reject(galat);
      else {
        for (const [mmsi, s] of statis) {
          const k = kapal.get(mmsi);
          if (!k) continue;
          k.tipe = s.tipe;
          k.kelas = kelasDariTipe(s.tipe);
          k.tujuan = s.tujuan;
          if (!k.nama && s.nama) k.nama = s.nama;
        }
        resolve([...kapal.values()]);
      }
    };
    const idTimer = setTimeout(() => selesai(), LAMA_SIMAK_MS);
    // aisstream mengirim frame biner; tanpa ini Node memberi Blob dan JSON.parse selalu gagal
    ws.binaryType = "arraybuffer";
    const pengurai = new TextDecoder();
    ws.onopen = () => {
      ws.send(JSON.stringify({ APIKey: kunci, BoundingBoxes: KOTAK, FilterMessageTypes: ["PositionReport", "StandardClassBPositionReport", "ShipStaticData"] }));
    };
    ws.onerror = () => selesai(new Error("koneksi aisstream gagal"));
    ws.onclose = () => selesai();
    ws.onmessage = (ev: MessageEvent) => {
      let m: PesanAis & { error?: string };
      try {
        const teks = typeof ev.data === "string" ? ev.data : pengurai.decode(ev.data as ArrayBuffer);
        m = JSON.parse(teks) as PesanAis & { error?: string };
      } catch {
        return;
      }
      if (m.error) {
        galatServer = m.error;
        return;
      }
      if (!m.MetaData?.MMSI) return;
      const mmsi = m.MetaData.MMSI;
      if (m.MessageType === "ShipStaticData" && m.Message?.ShipStaticData) {
        const s = m.Message.ShipStaticData;
        statis.set(mmsi, { tipe: s.Type ?? null, tujuan: (s.Destination ?? "").trim(), nama: (s.Name ?? "").trim() });
        return;
      }
      const pos = m.Message?.PositionReport ?? m.Message?.StandardClassBPositionReport;
      const lat = pos?.Latitude ?? m.MetaData.latitude;
      const lon = pos?.Longitude ?? m.MetaData.longitude;
      if (typeof lat !== "number" || typeof lon !== "number") return;
      const heading = pos?.TrueHeading != null && pos.TrueHeading < 360 ? pos.TrueHeading : null;
      kapal.set(mmsi, {
        mmsi,
        nama: (m.MetaData.ShipName ?? "").trim(),
        lat,
        lon,
        cog: pos?.Cog ?? null,
        sog: pos?.Sog ?? null,
        heading,
        tipe: null,
        kelas: "lainnya",
        tujuan: "",
        bendera: "",
        waktu: new Date().toISOString(),
        tersanksi: false,
      });
    };
  });
}

export async function GET() {
  await connection(); // selalu dinamis: hasil tergantung waktu dan kunci lingkungan
  const kunci = process.env.AISSTREAM_API_KEY;
  if (!kunci) return NextResponse.json({ error: "AISSTREAM_API_KEY belum dipasang" }, { status: 503 });
  const sekarang = Date.now();
  if (cache && sekarang - cache.waktu < CACHE_MS) {
    return NextResponse.json({ diambil: cache.diambil, durasi_detik: LAMA_SIMAK_MS / 1000, sumber: "cache", jumlah: cache.kapal.length, kapal: cache.kapal }, { headers: { "Cache-Control": "public, max-age=20, s-maxage=40" } });
  }
  try {
    if (!sedang) {
      sedang = simak(kunci).finally(() => {
        sedang = null;
      });
    }
    const kapal = await sedang;
    // hasil kosong hanya dicache sebentar supaya percobaan berikutnya cepat
    cache = { waktu: kapal.length ? Date.now() : Date.now() - CACHE_MS + 10_000, kapal, diambil: new Date().toISOString() };
    return NextResponse.json(
      { diambil: cache.diambil, durasi_detik: LAMA_SIMAK_MS / 1000, sumber: "live", jumlah: kapal.length, kapal, ...(galatServer ? { galat: galatServer } : {}) },
      { headers: { "Cache-Control": kapal.length ? "public, max-age=20, s-maxage=40" : "no-store" } },
    );
  } catch (e) {
    if (cache) return NextResponse.json({ diambil: cache.diambil, durasi_detik: LAMA_SIMAK_MS / 1000, sumber: "cache", jumlah: cache.kapal.length, kapal: cache.kapal });
    return NextResponse.json({ error: e instanceof Error ? e.message : "gagal" }, { status: 502 });
  }
}
