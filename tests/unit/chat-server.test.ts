import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { asalDiizinkan } from "@/lib/chat/asal";
import { PenyimpanMemori, lewatBatas, sidikIp } from "@/lib/chat/batas";
import { DEFINISI_ALAT } from "@/lib/chat/alat";
import { MODEL_BAWAAN, daftarModel, tanyaModel, type PesanModel } from "@/lib/chat/model";
import { pesanPengguna, promptSistem } from "@/lib/chat/prompt";
import { SUMBER_LUAR, headerKeamanan, kebijakanKonten } from "@/lib/keamanan";
import { URL_SNAPSHOT_RAW } from "@/lib/live/kapal";
import { URL_KATALOG_RAW } from "@/lib/live/satelit";
import { URL_CITRA_ESRI, URL_STYLE_GELAP } from "@/lib/mapStyle";
import { LAPISAN } from "@/lib/layers";
import { indeksAsli } from "./bantu";

describe("batas laju", () => {
  it("permintaan ke-31 dalam 10 menit ditolak, jendela baru diterima lagi", async () => {
    let kini = 1_000_000;
    const simpan = new PenyimpanMemori(() => kini);
    const jendela = 10 * 60 * 1000;
    for (let i = 1; i <= 30; i++) expect(await lewatBatas(simpan, "ip:a", 30, jendela, kini), `ke-${i}`).toBe(false);
    expect(await lewatBatas(simpan, "ip:a", 30, jendela, kini)).toBe(true);
    // IP lain tidak ikut kena
    expect(await lewatBatas(simpan, "ip:b", 30, jendela, kini)).toBe(false);
    kini += jendela + 1000;
    expect(await lewatBatas(simpan, "ip:a", 30, jendela, kini)).toBe(false);
  });

  it("hitungan bertahan walau dibaca objek pembatas yang baru (penyimpan bersama)", async () => {
    const simpan = new PenyimpanMemori();
    await lewatBatas(simpan, "ip:a", 1, 60_000);
    // "server baru nyala": tidak ada state di luar penyimpan
    expect(await lewatBatas(simpan, "ip:a", 1, 60_000)).toBe(true);
  });

  it("penyimpan yang rusak tidak mematikan asisten", async () => {
    const rusak = { get: async () => Promise.reject(new Error("putus")), set: async () => undefined };
    const diam = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    expect(await lewatBatas(rusak, "ip:a", 1, 60_000)).toBe(false);
    diam.mockRestore();
  });

  it("IP disimpan sebagai sidik, bukan alamat mentah", () => {
    expect(sidikIp("203.0.113.7")).toMatch(/^[0-9a-f]{16}$/);
    expect(sidikIp("203.0.113.7")).toBe(sidikIp("203.0.113.7"));
    expect(sidikIp("203.0.113.7")).not.toBe(sidikIp("203.0.113.8"));
  });
});

describe("cek asal permintaan", () => {
  const h = (isi: Record<string, string>) => new Headers(isi);

  it("menerima permintaan dari situs sendiri", () => {
    expect(asalDiizinkan(h({ origin: "https://eye-of-garuda.vercel.app", host: "eye-of-garuda.vercel.app", "sec-fetch-site": "same-origin" }))).toBe(true);
    expect(asalDiizinkan(h({ origin: "http://localhost:3000", host: "localhost:3000" }))).toBe(true);
    expect(asalDiizinkan(h({ origin: "https://eog.example.id", "x-forwarded-host": "eog.example.id", host: "internal:3000" }))).toBe(true);
  });

  it("menolak tanpa Origin, dari situs lain, atau lintas situs", () => {
    expect(asalDiizinkan(h({ host: "eye-of-garuda.vercel.app" }))).toBe(false);
    expect(asalDiizinkan(h({ origin: "https://situs-lain.example", host: "eye-of-garuda.vercel.app" }))).toBe(false);
    expect(asalDiizinkan(h({ origin: "https://eye-of-garuda.vercel.app", host: "eye-of-garuda.vercel.app", "sec-fetch-site": "cross-site" }))).toBe(false);
    expect(asalDiizinkan(h({ origin: "null", host: "eye-of-garuda.vercel.app" }))).toBe(false);
  });

  it("asal tambahan bisa didaftarkan lewat env", () => {
    const kepala = h({ origin: "https://garuda.example.id", host: "eye-of-garuda.vercel.app", "sec-fetch-site": "cross-site" });
    expect(asalDiizinkan(kepala, "https://lain.example, https://garuda.example.id")).toBe(true);
    expect(asalDiizinkan(kepala, "")).toBe(false);
  });
});

describe("prompt", () => {
  it("system prompt statis, memuat semua lapisan, dan tetap hemat token", () => {
    for (const lang of ["id", "en"] as const) {
      const p = promptSistem(lang);
      expect(p).toBe(promptSistem(lang));
      for (const l of LAPISAN) expect(p).toContain(`- ${l.id} [`);
      for (const alat of DEFINISI_ALAT) expect(p).toContain(alat.function.name);
      expect(p).toContain("@terbang:");
      // ±4 karakter per token: jaga supaya prompt + skema alat jauh di bawah kuota 8.000 token/menit
      expect(p.length + JSON.stringify(DEFINISI_ALAT).length).toBeLessThan(9000);
    }
  });

  it("keadaan layar dan DATA ditempel di pesan pengguna, bukan di system prompt", () => {
    expect(pesanPengguna("id", "Halo", "", "")).toBe("Halo");
    const pesan = pesanPengguna("id", "Terdekat dari Natuna?", "Lapisan aktif: Markas TNI.", "1. Changi: 566 km");
    expect(pesan).toBe("LAYAR: Lapisan aktif: Markas TNI.\n\nDATA:\n1. Changi: 566 km\n\nPERTANYAAN: Terdekat dari Natuna?");
    expect(pesanPengguna("en", "Hi", "", "x")).toContain("QUESTION: Hi");
  });
});

describe("header keamanan", () => {
  it("CSP mengizinkan semua host yang diambil browser", () => {
    const csp = kebijakanKonten();
    const sambung = csp.split("; ").find((a) => a.startsWith("connect-src"))!;
    for (const url of [URL_STYLE_GELAP, URL_CITRA_ESRI, URL_SNAPSHOT_RAW, URL_KATALOG_RAW]) expect(sambung, url).toContain(new URL(url.replace(/\{.\}/g, "0")).origin);
    for (const host of SUMBER_LUAR.sambung) expect(host).toMatch(/^https:\/\/[a-z0-9.-]+$/);
  });

  it("produksi tanpa eval, dev boleh", () => {
    expect(kebijakanKonten(false)).not.toContain("unsafe-eval");
    expect(kebijakanKonten(true)).toContain("'unsafe-eval'");
    expect(kebijakanKonten()).toContain("object-src 'none'");
    expect(kebijakanKonten()).toContain("frame-ancestors 'self'");
  });

  it("header pendamping lengkap", () => {
    const nama = headerKeamanan().map((x) => x.key);
    expect(nama).toEqual(["Content-Security-Policy", "X-Frame-Options", "X-Content-Type-Options", "Referrer-Policy", "Permissions-Policy"]);
  });
});

// ---------- model bahasa (API dipalsukan) ----------

type Balasan = { status?: number; isi?: unknown };

function apiPalsu(urutan: Balasan[]) {
  const panggilan: { model: string; badan: Record<string, unknown> }[] = [];
  const ambil = vi.fn(async (_url: unknown, init?: RequestInit) => {
    const badan = JSON.parse(String(init?.body)) as Record<string, unknown>;
    panggilan.push({ model: String(badan.model), badan });
    const b = urutan.shift() ?? { status: 500 };
    return new Response(JSON.stringify(b.isi ?? { error: { message: "rahasia internal" } }), { status: b.status ?? 200 });
  }) as unknown as typeof fetch;
  return { ambil, panggilan };
}

const jawab = (teks: string): Balasan => ({ isi: { choices: [{ message: { content: teks }, finish_reason: "stop" }] } });
const panggilAlat = (nama: string, argumen: unknown): Balasan => ({
  isi: { choices: [{ message: { content: null, tool_calls: [{ id: "call_1", type: "function", function: { name: nama, arguments: JSON.stringify(argumen) } }] }, finish_reason: "tool_calls" }] },
});

const PESAN: PesanModel[] = [
  { role: "system", content: "sistem" },
  { role: "user", content: "Pangkalan asing terdekat dari Natuna?" },
];

describe("tanyaModel", () => {
  let diam: ReturnType<typeof vi.spyOn>;
  beforeEach(() => {
    diam = vi.spyOn(console, "warn").mockImplementation(() => undefined);
  });
  afterEach(() => diam.mockRestore());

  const dasar = { url: "https://api.contoh/v1/chat/completions", kunci: "k", model: MODEL_BAWAAN, pesan: PESAN, indeks: indeksAsli() };

  it("model utama menjawab langsung dan dicatat", async () => {
    const { ambil, panggilan } = apiPalsu([jawab("Changi Naval Base, 566 km.")]);
    const r = await tanyaModel({ ...dasar, ambil });
    expect(r).toMatchObject({ jawaban: "Changi Naval Base, 566 km.", model: MODEL_BAWAAN[0].id, alat: [] });
    expect(r.percobaan).toEqual([{ model: MODEL_BAWAAN[0].id, hasil: "ok" }]);
    expect(panggilan[0].badan).toMatchObject({ model: "openai/gpt-oss-120b", reasoning_effort: "low", tool_choice: "auto" });
    expect(panggilan[0].badan.tools).toHaveLength(DEFINISI_ALAT.length);
  });

  it("panggilan alat dijalankan di server lalu hasilnya dikirim balik ke model", async () => {
    const { ambil, panggilan } = apiPalsu([panggilAlat("terdekat", { dari: "Natuna", lapisan: "asing", jumlah: 1 }), jawab("Yang terdekat **Changi Naval Base**.")]);
    const r = await tanyaModel({ ...dasar, ambil });
    expect(r.alat).toEqual(["terdekat"]);
    expect(r.jawaban).toContain("Changi");
    const pesanKedua = panggilan[1].badan.messages as PesanModel[];
    const hasilAlat = pesanKedua[pesanKedua.length - 1];
    expect(hasilAlat).toMatchObject({ role: "tool", tool_call_id: "call_1", name: "terdekat" });
    expect(JSON.parse(hasilAlat.content!).hasil[0].nama).toBe("Changi Naval Base");
  });

  it("model yang tidak ada lagi (404) atau kena kuota (429) dilewati ke cadangan", async () => {
    const { ambil, panggilan } = apiPalsu([{ status: 404 }, { status: 429 }, jawab("dari cadangan")]);
    const r = await tanyaModel({ ...dasar, ambil });
    expect(r.model).toBe(MODEL_BAWAAN[2].id);
    expect(r.percobaan.map((p) => p.hasil)).toEqual(["404", "429", "ok"]);
    expect(panggilan.map((p) => p.model)).toEqual(MODEL_BAWAAN.map((m) => m.id));
  });

  it("400 (parameter atau alat ditolak): model yang sama dicoba lagi tanpa alat", async () => {
    const { ambil, panggilan } = apiPalsu([{ status: 400 }, jawab("jawaban sederhana")]);
    const r = await tanyaModel({ ...dasar, ambil });
    expect(r.model).toBe(MODEL_BAWAAN[0].id);
    expect(r.percobaan.map((p) => p.hasil)).toEqual(["400", "ok (tanpa alat)"]);
    expect(panggilan[1].badan.tools).toBeUndefined();
    expect(panggilan[1].badan.reasoning_effort).toBeUndefined();
  });

  it("kunci salah langsung berhenti, semua gagal dilaporkan upstream tanpa rincian", async () => {
    const salah = await tanyaModel({ ...dasar, ambil: apiPalsu([{ status: 401 }]).ambil });
    expect(salah.galat).toBe("bad_key");
    const habis = await tanyaModel({ ...dasar, ambil: apiPalsu([{ status: 503 }, { status: 503 }, { status: 503 }]).ambil });
    expect(habis.galat).toBe("upstream");
    expect(JSON.stringify(habis)).not.toContain("rahasia internal");
  });

  it("blok <think> dibuang, jawaban kosong dianggap gagal", async () => {
    const { ambil } = apiPalsu([jawab("<think>hmm</think>"), jawab("<think>hmm</think>Halo!")]);
    const r = await tanyaModel({ ...dasar, ambil });
    expect(r.jawaban).toBe("Halo!");
    expect(r.percobaan.map((p) => p.hasil)).toEqual(["kosong", "ok (tanpa alat)"]);
  });

  it("putaran alat dibatasi supaya model tidak berputar terus", async () => {
    const terus = Array.from({ length: 3 }, () => panggilAlat("hitung", { lapisan: "tni" }));
    const { ambil, panggilan } = apiPalsu([...terus, jawab("selesai")]);
    const r = await tanyaModel({ ...dasar, ambil });
    expect(r.jawaban).toBe("selesai");
    expect(panggilan[3].badan.tool_choice).toBe("none");
  });

  it("CHAT_MODEL jadi model utama tanpa menduplikasi daftar", () => {
    expect(daftarModel(undefined)).toBe(MODEL_BAWAAN);
    expect(daftarModel("model/baru").map((m) => m.id)).toEqual(["model/baru", ...MODEL_BAWAAN.map((m) => m.id)]);
    expect(daftarModel("qwen/qwen3.8-27b").map((m) => m.id)).toEqual(["qwen/qwen3.8-27b", "openai/gpt-oss-120b", "openai/gpt-oss-20b"]);
  });
});
