import { describe, expect, it } from "vitest";
import { tampilanAwal, uraiHash, TAMPILAN_AWAL } from "@/lib/urlState";

describe("uraiHash", () => {
  it("membaca tampilan, lapisan, bahasa, dan pilihan", () => {
    const s = uraiHash("#v=-6.200/106.800/7.50/15/40&l=tni,asing&lang=en&sat=1&2d=1&sel=tni-12");
    expect(s.tampilan).toEqual({ lat: -6.2, lon: 106.8, zoom: 7.5, bearing: 15, pitch: 40 });
    expect(s.lapisan).toEqual(["tni", "asing"]);
    expect(s.lang).toBe("en");
    expect(s.sat).toBe(true);
    expect(s.datar).toBe(true);
    expect(s.pilih).toBe("tni-12");
  });

  it("hash kosong menghasilkan objek kosong", () => {
    expect(uraiHash("")).toEqual({});
    expect(uraiHash("#")).toEqual({});
  });

  it("mengabaikan lintang/bujur di luar rentang", () => {
    expect(uraiHash("v=200/106/5").tampilan).toBeUndefined();
    expect(uraiHash("v=-6/400/5").tampilan).toBeUndefined();
    expect(uraiHash("v=abc/106/5").tampilan).toBeUndefined();
  });

  it("bagian v yang kosong tidak terbaca sebagai 0", () => {
    expect(uraiHash("v=-6//5").tampilan).toBeUndefined();
    expect(uraiHash("v=/106/5").tampilan).toBeUndefined();
    expect(uraiHash("v=-6/106/ ").tampilan).toBeUndefined();
    expect(uraiHash("v=-6/106/5//").tampilan).toEqual({ lat: -6, lon: 106, zoom: 5, bearing: 0, pitch: 0 });
  });

  it("menjepit zoom dan pitch ke rentang peta", () => {
    const t = uraiHash("v=-6/106/99/0/120").tampilan;
    expect(t?.zoom).toBe(22);
    expect(t?.pitch).toBe(85);
    expect(uraiHash("v=-6/106/-3").tampilan?.zoom).toBe(0);
  });

  it("bahasa tidak dikenal diabaikan dan l kosong berarti tanpa lapisan", () => {
    const s = uraiHash("lang=fr&l=");
    expect(s.lang).toBeUndefined();
    expect(s.lapisan).toEqual([]);
  });
});

describe("tampilanAwal", () => {
  it("desktop tetap zoom bawaan, HP diperkecil", () => {
    expect(tampilanAwal(1440).zoom).toBe(TAMPILAN_AWAL.zoom);
    expect(tampilanAwal(360).zoom).toBeLessThan(TAMPILAN_AWAL.zoom);
  });
});
