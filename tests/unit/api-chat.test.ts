/** Rute /api/chat dari ujung ke ujung, dengan API model bahasa dipalsukan. */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/chat/route";
import { siapkanFakta } from "@/lib/chat/fakta";
import { indeksAsli } from "./bantu";

const ASAL = "https://eye-of-garuda.vercel.app";
let nomorIp = 0;

function permintaan(pesan: string, kepala: Record<string, string> = {}, lang: "id" | "en" = "id"): Request {
  return new Request(`${ASAL}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json", origin: ASAL, host: "eye-of-garuda.vercel.app", "x-forwarded-for": `198.51.100.${nomorIp}`, ...kepala },
    body: JSON.stringify({ lang, konteks: "Lapisan aktif: Markas TNI.", messages: [{ role: "user", content: pesan }] }),
  });
}

let badanTerakhir: { messages: { role: string; content: string }[]; tools?: unknown[] } | null = null;

function pasangModel(balasan: (nomor: number) => Response) {
  let n = 0;
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: unknown, init?: RequestInit) => {
      if (!String(url).includes("api.groq.com")) return new Response("{}", { status: 404 });
      badanTerakhir = JSON.parse(String(init?.body));
      return balasan(n++);
    }),
  );
}

const sukses = (teks: string) => new Response(JSON.stringify({ choices: [{ message: { content: teks } }] }), { status: 200 });

describe("POST /api/chat", () => {
  beforeEach(() => {
    nomorIp += 1;
    vi.stubEnv("GROQ_API_KEY", "kunci-uji");
    vi.spyOn(console, "info").mockImplementation(() => undefined);
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("menolak permintaan tanpa Origin situs", async () => {
    pasangModel(() => sukses("tidak boleh sampai sini"));
    const res = await POST(permintaan("halo", { origin: "https://situs-lain.example" }));
    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ galat: "forbidden" });
    expect(fetch).not.toHaveBeenCalled();
  });

  it("tanpa kunci membalas 503 supaya browser pindah ke mode FAQ", async () => {
    vi.stubEnv("GROQ_API_KEY", "");
    vi.stubEnv("CHAT_API_KEY", "");
    const res = await POST(permintaan("halo"));
    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ galat: "no_key" });
  });

  it("menempel DATA hasil hitungan server ke pertanyaan dan mencatat model", async () => {
    pasangModel(() => sukses("Yang terdekat **Changi Naval Base** di Singapura, sekitar 566 km."));
    const res = await POST(permintaan("Pangkalan asing terdekat dari Natuna apa?"));
    expect(res.status).toBe(200);
    const data = (await res.json()) as { jawaban: string; model: string; alat: string[] };
    expect(data.model).toBe("openai/gpt-oss-120b");
    expect(data.alat).toEqual(["terdekat"]);
    // baris aksi dilengkapi server walau model lupa
    expect(data.jawaban).toContain("@terbang: Changi Naval Base");
    expect(data.jawaban).toContain("@lapisan: asing");
    const pesanAkhir = badanTerakhir!.messages.at(-1)!.content;
    expect(pesanAkhir).toContain("LAYAR: Lapisan aktif: Markas TNI.");
    expect(pesanAkhir).toContain("DATA:\nPangkalan asing terdekat dari Natuna (Ranai)");
    expect(pesanAkhir).toMatch(/1\. Changi Naval Base .*: 566 km/);
    expect(console.info).toHaveBeenCalledWith("[chat]", expect.stringContaining('"model":"openai/gpt-oss-120b"'));
  });

  it("kalau fakta sudah dihitung server, model tidak ditawari alat; tanpa fakta, alat dikirim", async () => {
    pasangModel(() => sukses("Markas TNI di Papua ada di blok DATA."));
    await POST(permintaan("Ada berapa markas TNI di Papua?"));
    expect(badanTerakhir!.tools).toBeUndefined();
    pasangModel(() => sukses("Konsol ini menampilkan postur pertahanan Indonesia."));
    await POST(permintaan("Ini apa sih?"));
    expect(badanTerakhir!.tools).toHaveLength(4);
  });

  it("jawaban model yang melenceng dari data diganti hitungan server", async () => {
    pasangModel(() => sukses("Pangkalan milik China di dekat Natuna tidak ada di data.\n@terbang: Natuna"));
    const res = await POST(permintaan("Pangkalan China terdekat dari Natuna?"));
    const data = (await res.json()) as { jawaban: string; model: string };
    expect(data.model).toBe("data");
    expect(data.jawaban).toMatch(/1\. Fiery Cross Reef .*: \d+ km/);
    expect(data.jawaban).toContain("@terbang: Fiery Cross Reef");
  });

  it("baris aksi ikut hitungan server, bukan tebakan model", async () => {
    const jumlah = siapkanFakta(indeksAsli(), "Ada berapa Lanud di Indonesia?", "id")!.wajib[0];
    pasangModel(() => sukses(`Ada **${jumlah}** Lanud di Indonesia.\n\n@terbang: Lanud Indonesia\n@lapisan: bandara`));
    const res = await POST(permintaan("Ada berapa Lanud di Indonesia?"));
    const data = (await res.json()) as { jawaban: string; model: string };
    expect(data.model).toBe("openai/gpt-oss-120b");
    expect(data.jawaban).toBe(`Ada **${jumlah}** Lanud di Indonesia.\n@lapisan: tni`);
  });

  it("semua model gagal: fakta dari data tetap dikirim, tanpa pesan error internal", async () => {
    pasangModel(() => new Response(JSON.stringify({ error: { message: "kuota organisasi org_123 habis" } }), { status: 429 }));
    const res = await POST(permintaan("Ada berapa markas TNI di Papua?"));
    expect(res.status).toBe(200);
    const data = (await res.json()) as { jawaban: string; model: string };
    expect(data.model).toBe("data");
    expect(data.jawaban).toMatch(/Jumlah markas TNI .*: \d+\./);
    expect(JSON.stringify(data)).not.toContain("org_123");
  });

  it("semua model gagal dan tidak ada fakta: 502 dengan kode saja", async () => {
    pasangModel(() => new Response(JSON.stringify({ error: { message: "kuota organisasi org_123 habis" } }), { status: 429 }));
    const res = await POST(permintaan("Ini apa sih?"));
    expect(res.status).toBe(502);
    expect(await res.json()).toEqual({ galat: "upstream" });
  });

  it("badan permintaan rusak atau tanpa pesan pengguna ditolak 400", async () => {
    pasangModel(() => sukses("x"));
    const rusak = new Request(`${ASAL}/api/chat`, { method: "POST", headers: { origin: ASAL, host: "eye-of-garuda.vercel.app" }, body: "{bukan json" });
    expect((await POST(rusak)).status).toBe(400);
    const kosong = new Request(`${ASAL}/api/chat`, { method: "POST", headers: { origin: ASAL, host: "eye-of-garuda.vercel.app" }, body: JSON.stringify({ messages: [{ role: "assistant", content: "hai" }] }) });
    expect((await POST(kosong)).status).toBe(400);
  });

  it("IP yang sama dibatasi 30 permintaan per 10 menit", async () => {
    pasangModel(() => sukses("ok"));
    const kepala = { "x-forwarded-for": "203.0.113.99" };
    for (let i = 0; i < 30; i++) {
      const ok = await POST(permintaan("halo", kepala));
      expect(ok.status).toBe(200);
      expect(ok.headers.get("RateLimit-Remaining")).toBe(String(29 - i));
    }
    const res = await POST(permintaan("halo", kepala));
    expect(res.status).toBe(429);
    expect(await res.json()).toEqual({ galat: "rate_limit" });
    expect(res.headers.get("RateLimit-Limit")).toBe("30");
    expect(res.headers.get("RateLimit-Remaining")).toBe("0");
    expect(Number(res.headers.get("Retry-After"))).toBeGreaterThan(0);
  });
});
