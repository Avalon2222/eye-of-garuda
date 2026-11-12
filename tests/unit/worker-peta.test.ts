import { afterEach, describe, expect, it, vi } from "vitest";

// modulnya menyimpan janji di level modul, jadi tiap tes memuat salinan baru
async function muatModul() {
  vi.resetModules();
  return import("@/lib/workerPeta");
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("worker MapLibre diunduh sekali (EOG-26)", () => {
  it("panggilan barengan cuma bikin satu request dan dapat blob URL yang sama", async () => {
    const fetchPalsu = vi.fn(async () => new Response("self.onmessage = () => {};", { status: 200 }));
    vi.stubGlobal("fetch", fetchPalsu);
    const { workerPetaSekali } = await muatModul();

    const hasil = await Promise.all([workerPetaSekali(), workerPetaSekali(), workerPetaSekali()]);

    expect(fetchPalsu).toHaveBeenCalledTimes(1);
    expect(hasil[0]).toMatch(/^blob:/);
    expect(new Set(hasil).size).toBe(1);
  });

  it("kalau unduhan gagal, balik ke URL biasa dan boleh dicoba lagi", async () => {
    const fetchPalsu = vi.fn(async () => new Response("", { status: 503 }));
    vi.stubGlobal("fetch", fetchPalsu);
    const { workerPetaSekali, URL_WORKER_PETA } = await muatModul();

    expect(await workerPetaSekali()).toBe(URL_WORKER_PETA);
    await workerPetaSekali();
    expect(fetchPalsu).toHaveBeenCalledTimes(2);
  });
});
