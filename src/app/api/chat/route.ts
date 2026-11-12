/**
 * Asisten obrolan Eye of Garuda. Alurnya:
 *   1. Tolak permintaan yang bukan dari situs ini (cek Origin) atau yang melewati batas laju per IP.
 *   2. Hitung fakta dari data peta untuk pertanyaan itu (yang terdekat, jumlah, jarak, letak).
 *   3. Kirim ke API chat yang kompatibel OpenAI (Groq, tier gratis). Model boleh memanggil alat data lagi.
 * Tanpa kunci (GROQ_API_KEY) endpoint menjawab 503 dan browser beralih ke mode FAQ tanpa AI.
 * Browser hanya menerima kode galat pendek; rinciannya ada di log server.
 */

import { NextResponse } from "next/server";
import { getCache } from "@vercel/functions";
import { asalDiizinkan } from "@/lib/chat/asal";
import { PenyimpanMemori, lewatBatas, sidikIp, type Penyimpan } from "@/lib/chat/batas";
import { jawabanSesuai, lapisanAntarmuka, siapkanFakta } from "@/lib/chat/fakta";
import { daftarModel, tanyaModel, type PesanModel } from "@/lib/chat/model";
import { muatIndeks } from "@/lib/chat/muat";
import { pesanPengguna, promptSistem } from "@/lib/chat/prompt";

export const maxDuration = 60;

const URL_API = process.env.CHAT_API_URL ?? "https://api.groq.com/openai/v1/chat/completions";
const MAKS_RIWAYAT = 8;
const MAKS_PANJANG = 1200;
const MAKS_LAYAR = 600;
const BATAS_PER_IP = 30; // permintaan per 10 menit
const JENDELA_MS = 10 * 60 * 1000;

interface PesanMasuk {
  role: "user" | "assistant";
  content: string;
}
interface Permintaan {
  messages: PesanMasuk[];
  lang?: "id" | "en";
  konteks?: string;
}

const cadangan = new PenyimpanMemori();

function penyimpan(): Penyimpan {
  try {
    return getCache({ namespace: "eog-chat" });
  } catch {
    return cadangan;
  }
}

function galat(kode: string, status: number) {
  return NextResponse.json({ galat: kode }, { status });
}

export async function POST(req: Request) {
  if (!asalDiizinkan(req.headers, process.env.CHAT_ASAL_IZIN)) return galat("forbidden", 403);

  const kunci = process.env.GROQ_API_KEY ?? process.env.CHAT_API_KEY;
  if (!kunci) return galat("no_key", 503);

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "anon";
  if (await lewatBatas(penyimpan(), `ip:${sidikIp(ip)}`, BATAS_PER_IP, JENDELA_MS)) return galat("rate_limit", 429);

  let body: Permintaan;
  try {
    body = (await req.json()) as Permintaan;
  } catch {
    return galat("bad_request", 400);
  }
  const lang = body.lang === "en" ? "en" : "id";
  const riwayat = (Array.isArray(body.messages) ? body.messages : [])
    .filter((m) => (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
    .slice(-MAKS_RIWAYAT)
    .map((m) => ({ role: m.role, content: m.content.slice(0, MAKS_PANJANG) }));
  if (riwayat.length === 0 || riwayat[riwayat.length - 1].role !== "user") return galat("bad_request", 400);

  const mulai = Date.now();
  const pertanyaan = riwayat[riwayat.length - 1].content;
  const layar = typeof body.konteks === "string" ? body.konteks.slice(0, MAKS_LAYAR) : "";
  const indeks = await muatIndeks(new URL(req.url).origin);
  const fakta = indeks.length ? siapkanFakta(indeks, pertanyaan, lang) : null;

  const pesan: PesanModel[] = [
    { role: "system", content: promptSistem(lang) },
    ...riwayat.slice(0, -1),
    { role: "user", content: pesanPengguna(lang, pertanyaan, layar, fakta?.teks ?? "") },
  ];
  // kalau jawabannya sudah dihitung server, model cukup merangkai kalimat dan tidak perlu alat lagi
  const hasil = await tanyaModel({ url: URL_API, kunci, model: daftarModel(process.env.CHAT_MODEL), pesan, indeks, tanpaAlat: Boolean(fakta) });
  // jawaban yang tidak memuat nama atau angka kunci dari data dianggap melenceng dan tidak dipakai
  const sesuai = !hasil.jawaban || !fakta || jawabanSesuai(hasil.jawaban, fakta.wajib);

  console.info(
    "[chat]",
    JSON.stringify({
      model: hasil.model ?? null,
      sesuai,
      percobaan: hasil.percobaan,
      alat: [...(fakta?.alat ?? []).map((a) => `server:${a}`), ...hasil.alat],
      objek: indeks.length,
      ms: Date.now() - mulai,
    }),
  );

  if (hasil.galat === "bad_key") return galat("bad_key", 503);

  const aksi: string[] = [];
  if (fakta?.terbang) aksi.push(`@terbang: ${fakta.terbang}`);
  if (fakta?.lapisan) aksi.push(`@lapisan: ${lapisanAntarmuka(fakta.lapisan)}`);

  if (!hasil.jawaban || !sesuai) {
    // semua model gagal atau jawabannya melenceng, tapi hitungan dari data tetap bisa dikirim apa adanya
    if (fakta) return NextResponse.json({ jawaban: [fakta.teks, ...aksi].join("\n"), model: "data", alat: fakta.alat });
    return galat("upstream", 502);
  }

  // kalau server sudah punya fakta, baris aksi ikut hasil hitungan server, bukan tebakan model
  let jawaban = hasil.jawaban;
  if (fakta) jawaban = [jawaban.replace(/^\s*@?(terbang|fly|lapisan|layer)\s*:.*$/gim, "").trimEnd(), ...aksi].join("\n");
  return NextResponse.json({ jawaban, model: hasil.model, alat: [...(fakta?.alat ?? []), ...hasil.alat] });
}
