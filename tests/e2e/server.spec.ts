import { expect, test } from "@playwright/test";

test.describe("server", () => {
  test.skip(({ viewport }) => (viewport?.width ?? 0) < 1000, "cukup dijalankan sekali");

  test("header keamanan terpasang di halaman dan API", async ({ request }) => {
    for (const jalur of ["/", "/api/kapal?mode=x", "/data/markas_tni.geojson"]) {
      const h = (await request.get(jalur)).headers();
      expect(h["content-security-policy"], jalur).toContain("default-src 'self'");
      expect(h["content-security-policy"], jalur).toContain("frame-ancestors 'self'");
      expect(h["x-frame-options"], jalur).toBe("SAMEORIGIN");
      expect(h["x-content-type-options"], jalur).toBe("nosniff");
      expect(h["referrer-policy"], jalur).toBe("strict-origin-when-cross-origin");
    }
  });

  test("/api/chat menolak permintaan tanpa Origin situs", async ({ request, baseURL }) => {
    const data = { messages: [{ role: "user", content: "halo" }] };
    const tanpa = await request.post("/api/chat", { data });
    expect(tanpa.status()).toBe(403);
    expect(await tanpa.json()).toEqual({ galat: "forbidden" });

    const luar = await request.post("/api/chat", { data, headers: { origin: "https://situs-lain.example" } });
    expect(luar.status()).toBe(403);

    // dari situs sendiri lolos cek asal; tanpa kunci AI server menjawab 503 dan browser pakai mode FAQ
    const sendiri = await request.post("/api/chat", { data, headers: { origin: baseURL! } });
    expect([200, 503]).toContain(sendiri.status());
    if (sendiri.status() === 503) expect(await sendiri.json()).toEqual({ galat: "no_key" });
  });

  test("galat API cuma berupa kode", async ({ request }) => {
    for (const jalur of ["/api/kapal", "/api/pesawat"]) {
      const res = await request.get(jalur);
      if (res.ok()) continue;
      const badan = (await res.json()) as Record<string, unknown>;
      expect(Object.keys(badan), jalur).toEqual(["galat"]);
      expect(String(badan.galat), jalur).toMatch(/^[a-z_]+$/);
    }
  });
});
