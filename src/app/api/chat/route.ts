/**
 * Asisten obrolan Eye of Garuda. Meneruskan pertanyaan ke API chat yang kompatibel OpenAI (Groq, tier gratis)
 * dengan pengetahuan tentang aplikasi ini sebagai system prompt. Tanpa kunci (GROQ_API_KEY) endpoint menjawab
 * 503 dan browser beralih ke mode FAQ tanpa AI.
 */

import { NextResponse } from "next/server";
import { ringkasanAplikasi } from "@/lib/pengetahuan";

const URL_API = process.env.CHAT_API_URL ?? "https://api.groq.com/openai/v1/chat/completions";
const MODEL = [process.env.CHAT_MODEL ?? "llama-3.3-70b-versatile", "openai/gpt-oss-120b", "llama-3.1-8b-instant"];
const MAKS_RIWAYAT = 8;
const MAKS_PANJANG = 1200;
const MAKS_TOKEN = 500;
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

const hitungan = new Map<string, { mulai: number; n: number }>();

function batasi(ip: string): boolean {
  const kini = Date.now();
  const h = hitungan.get(ip);
  if (!h || kini - h.mulai > JENDELA_MS) {
    hitungan.set(ip, { mulai: kini, n: 1 });
    return false;
  }
  h.n += 1;
  if (hitungan.size > 5000) hitungan.clear();
  return h.n > BATAS_PER_IP;
}

function promptSistem(lang: "id" | "en", konteks: string): string {
  const aturan =
    lang === "en"
      ? `You are the on-board assistant of Eye of Garuda. Answer briefly (max ~120 words), in English, plain text without Markdown headings. Stick to what the app shows and how to use it; for general defence questions, answer carefully and remind that this app only shows public, approximate data. Never invent numbers or sources. If the user asks about a place or unit that the map may contain, end your reply with one line exactly like: @terbang: <name as it appears on the map> so the globe can fly there. If a layer should be switched on, add a line: @lapisan: <layer id> using ids: tni, asing, bandara, batas, alki, kabel, pelabuhan, kapal, pesawat, satelit, zee, radius, sipri, insiden.`
      : `Kamu adalah asisten di dalam Eye of Garuda. Jawab singkat (maks ~120 kata), dalam bahasa Indonesia yang santai tapi sopan, teks polos tanpa judul Markdown. Fokus pada apa yang ditampilkan aplikasi dan cara memakainya; untuk pertanyaan pertahanan umum, jawab hati-hati dan ingatkan bahwa aplikasi ini hanya menampilkan data publik yang bersifat perkiraan. Jangan mengarang angka atau sumber. Kalau pengguna menanyakan tempat atau satuan yang mungkin ada di peta, akhiri jawaban dengan satu baris persis seperti: @terbang: <nama seperti di peta> supaya globe bisa terbang ke sana. Kalau ada lapisan yang perlu dinyalakan, tambahkan baris: @lapisan: <id lapisan> dengan id: tni, asing, bandara, batas, alki, kabel, pelabuhan, kapal, pesawat, satelit, zee, radius, sipri, insiden.`;
  return `${aturan}\n\n${ringkasanAplikasi(lang)}\n\n${konteks ? (lang === "en" ? "CURRENT STATE OF THE USER'S SCREEN:\n" : "KEADAAN LAYAR PENGGUNA SAAT INI:\n") + konteks : ""}`;
}

export async function POST(req: Request) {
  const kunci = process.env.GROQ_API_KEY ?? process.env.CHAT_API_KEY;
  if (!kunci) return NextResponse.json({ galat: "no_key" }, { status: 503 });

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "anon";
  if (batasi(ip)) return NextResponse.json({ galat: "rate_limit" }, { status: 429 });

  let body: Permintaan;
  try {
    body = (await req.json()) as Permintaan;
  } catch {
    return NextResponse.json({ galat: "bad_request" }, { status: 400 });
  }
  const lang = body.lang === "en" ? "en" : "id";
  const riwayat = (Array.isArray(body.messages) ? body.messages : [])
    .filter((m) => (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
    .slice(-MAKS_RIWAYAT)
    .map((m) => ({ role: m.role, content: m.content.slice(0, MAKS_PANJANG) }));
  if (riwayat.length === 0 || riwayat[riwayat.length - 1].role !== "user") {
    return NextResponse.json({ galat: "bad_request" }, { status: 400 });
  }
  const konteks = typeof body.konteks === "string" ? body.konteks.slice(0, 1500) : "";
  const pesan = [{ role: "system", content: promptSistem(lang, konteks) }, ...riwayat];

  let galatTerakhir = "";
  for (const model of MODEL) {
    try {
      const res = await fetch(URL_API, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${kunci}` },
        body: JSON.stringify({ model, messages: pesan, temperature: 0.4, max_tokens: MAKS_TOKEN }),
        signal: AbortSignal.timeout(20000),
        cache: "no-store",
      });
      if (res.status === 401 || res.status === 403) return NextResponse.json({ galat: "bad_key" }, { status: 503 });
      if (res.status === 429 || res.status === 503 || res.status === 404 || res.status === 400) {
        galatTerakhir = `HTTP ${res.status} (${model})`;
        continue;
      }
      if (!res.ok) {
        galatTerakhir = `HTTP ${res.status} (${model})`;
        continue;
      }
      const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
      const jawaban = data.choices?.[0]?.message?.content?.trim();
      if (!jawaban) {
        galatTerakhir = `kosong (${model})`;
        continue;
      }
      return NextResponse.json({ jawaban, model });
    } catch (e) {
      galatTerakhir = e instanceof Error ? e.message : String(e);
    }
  }
  return NextResponse.json({ galat: "upstream", detail: galatTerakhir }, { status: 502 });
}
