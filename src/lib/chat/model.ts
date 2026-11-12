/**
 * Pemanggil model bahasa (API chat yang kompatibel OpenAI, bawaannya Groq tier gratis).
 * Model dicoba berurutan; tiap model boleh memanggil alat data beberapa putaran sebelum menjawab.
 * `ambil` bisa diganti di tes supaya tidak perlu jaringan.
 */

import { DEFINISI_ALAT, jalankanAlat } from "./alat";
import type { ObjekPeta } from "./indeks";

export interface KonfigModel {
  id: string;
  /** parameter tambahan khusus model, mis. reasoning_effort */
  ekstra?: Record<string, unknown>;
}

/**
 * Urutan model di tier gratis Groq (cek https://console.groq.com/docs/models kalau ada yang pensiun).
 * Kuota dihitung per model, jadi cadangan menambah kapasitas, bukan cuma jaga-jaga.
 */
export const MODEL_BAWAAN: KonfigModel[] = [
  { id: "openai/gpt-oss-120b", ekstra: { reasoning_effort: "low" } },
  { id: "qwen/qwen3.8-27b", ekstra: { reasoning_effort: "none" } },
  { id: "openai/gpt-oss-20b", ekstra: { reasoning_effort: "low" } },
];

/** CHAT_MODEL (opsional) jadi model utama di depan daftar bawaan. */
export function daftarModel(utama?: string): KonfigModel[] {
  const id = utama?.trim();
  if (!id) return MODEL_BAWAAN;
  const dikenal = MODEL_BAWAAN.find((m) => m.id === id);
  return [dikenal ?? { id }, ...MODEL_BAWAAN.filter((m) => m.id !== id)];
}

export interface PesanModel {
  role: "system" | "user" | "assistant" | "tool";
  content: string | null;
  tool_calls?: PanggilanAlat[];
  tool_call_id?: string;
  name?: string;
}

interface PanggilanAlat {
  id: string;
  type: "function";
  function: { name: string; arguments: string };
}

interface BalasanApi {
  choices?: { message?: { content?: string | null; tool_calls?: PanggilanAlat[] }; finish_reason?: string }[];
}

export interface Percobaan {
  model: string;
  /** "ok", kode HTTP, atau jenis galat singkat */
  hasil: string;
}

export interface HasilModel {
  jawaban?: string;
  model?: string;
  /** alat yang dipanggil model */
  alat: string[];
  percobaan: Percobaan[];
  galat?: "bad_key" | "upstream";
}

export interface OpsiTanya {
  url: string;
  kunci: string;
  model: KonfigModel[];
  pesan: PesanModel[];
  indeks: ObjekPeta[];
  ambil?: typeof fetch;
  /** batas waktu total, ms */
  tenggatMs?: number;
  maksToken?: number;
}

const MAKS_PUTARAN_ALAT = 3;
const WAKTU_PER_PANGGILAN_MS = 15_000;

class GalatHttp extends Error {
  constructor(
    public status: number,
    public rincian: string,
  ) {
    super(`HTTP ${status}`);
  }
}

function bersihkan(teks: string): string {
  return teks.replace(/<think>[\s\S]*?<\/think>/g, "").trim();
}

async function panggil(o: OpsiTanya, badan: Record<string, unknown>, sisaMs: number): Promise<BalasanApi> {
  const ambil = o.ambil ?? fetch;
  const res = await ambil(o.url, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${o.kunci}` },
    body: JSON.stringify(badan),
    signal: AbortSignal.timeout(Math.max(1000, Math.min(WAKTU_PER_PANGGILAN_MS, sisaMs))),
    cache: "no-store",
  });
  if (!res.ok) {
    let rincian = "";
    try {
      rincian = (await res.text()).slice(0, 300);
    } catch {
      /* abaikan */
    }
    throw new GalatHttp(res.status, rincian);
  }
  return (await res.json()) as BalasanApi;
}

/** Satu model, satu mode. Mode lengkap memakai alat; mode sederhana hanya pesan, untuk model yang menolak parameter tambahan. */
async function cobaModel(o: OpsiTanya, m: KonfigModel, lengkap: boolean, habis: number, alatDipakai: string[]): Promise<string> {
  const pesan: PesanModel[] = [...o.pesan];
  const dasar = { model: m.id, temperature: 0.3 };
  for (let putaran = 0; putaran <= MAKS_PUTARAN_ALAT; putaran++) {
    const sisa = habis - Date.now();
    if (sisa < 1500) throw new Error("tenggat");
    const badan: Record<string, unknown> = lengkap
      ? { ...dasar, messages: pesan, max_completion_tokens: o.maksToken ?? 900, tools: DEFINISI_ALAT, tool_choice: putaran === MAKS_PUTARAN_ALAT ? "none" : "auto", ...(m.ekstra ?? {}) }
      : { ...dasar, messages: pesan, max_tokens: o.maksToken ?? 900 };
    const data = await panggil(o, badan, sisa);
    const balasan = data.choices?.[0]?.message;
    const panggilan = lengkap && putaran < MAKS_PUTARAN_ALAT ? (balasan?.tool_calls ?? []) : [];
    if (panggilan.length === 0) {
      const teks = bersihkan(balasan?.content ?? "");
      if (!teks) throw new Error("kosong");
      return teks;
    }
    pesan.push({ role: "assistant", content: balasan?.content ?? null, tool_calls: panggilan });
    for (const p of panggilan.slice(0, 4)) {
      let argumen: unknown = {};
      try {
        argumen = JSON.parse(p.function.arguments || "{}");
      } catch {
        /* argumen rusak: alat membalas galat */
      }
      alatDipakai.push(p.function.name);
      pesan.push({ role: "tool", tool_call_id: p.id, name: p.function.name, content: JSON.stringify(jalankanAlat(o.indeks, p.function.name, argumen)) });
    }
  }
  throw new Error("kosong");
}

/** Coba model satu per satu sampai ada yang menjawab. Rincian galat hanya masuk log server. */
export async function tanyaModel(o: OpsiTanya): Promise<HasilModel> {
  const habis = Date.now() + (o.tenggatMs ?? 40_000);
  const percobaan: Percobaan[] = [];
  for (const m of o.model) {
    for (const lengkap of [true, false]) {
      if (habis - Date.now() < 1500) break;
      const alat: string[] = [];
      try {
        const jawaban = await cobaModel(o, m, lengkap, habis, alat);
        percobaan.push({ model: m.id, hasil: lengkap ? "ok" : "ok (tanpa alat)" });
        return { jawaban, model: m.id, alat, percobaan };
      } catch (e) {
        if (e instanceof GalatHttp) {
          percobaan.push({ model: m.id, hasil: String(e.status) });
          console.warn(`[chat] ${m.id} gagal: HTTP ${e.status} ${e.rincian}`);
          if (e.status === 401 || e.status === 403) return { alat: [], percobaan, galat: "bad_key" };
          // 400/422: biasanya parameter atau panggilan alat ditolak, coba lagi model yang sama tanpa alat
          if (lengkap && (e.status === 400 || e.status === 422)) continue;
          break;
        }
        const pesan = e instanceof Error ? e.message : String(e);
        percobaan.push({ model: m.id, hasil: pesan === "kosong" || pesan === "tenggat" ? pesan : "jaringan" });
        console.warn(`[chat] ${m.id} gagal: ${pesan}`);
        if (lengkap && pesan === "kosong") continue;
        break;
      }
    }
  }
  return { alat: [], percobaan, galat: "upstream" };
}
