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

  it("bearing tak hingga jadi 0 dan bearing besar dibungkus ke -180..180", () => {
    expect(uraiHash("v=-6/106/5/Infinity/0").tampilan?.bearing).toBe(0);
    expect(uraiHash("v=-6/106/5/370/0").tampilan?.bearing).toBe(10);
    expect(uraiHash("v=-6/106/5/-190/0").tampilan?.bearing).toBe(170);
    expect(uraiHash("v=-6/106/5/180/0").tampilan?.bearing).toBe(180);
  });

  it("daftar lapisan dirapikan dari spasi dan duplikat", () => {
    expect(uraiHash("l=tni, asing,tni,,").lapisan).toEqual(["tni", "asing"]);
  });

  it("id lapisan yang tidak dikenal dibuang", () => {
    expect(uraiHash("l=tni,radar,asing,TNI").lapisan).toEqual(["tni", "asing"]);
  });

  it("menjepit zoom dan pitch ke rentang peta", () => {
    const t = uraiHash("v=-6/106/99/0/120").tampilan;
    expect(t?.zoom).toBe(22);
    expect(t?.pitch).toBe(85);
    expect(uraiHash("v=-6/106/-3").tampilan?.zoom).toBe(0);
  });

  it("pilihan objek dirapikan dari spasi, dan pilihan kosong diabaikan", () => {
    expect(uraiHash("sel=%20tni-12%20").pilih).toBe("tni-12");
    expect(uraiHash("sel=%20%20").pilih).toBeUndefined();
  });

  it("bahasa tidak peka huruf besar dan spasi", () => {
    expect(uraiHash("lang=EN").lang).toBe("en");
    expect(uraiHash("lang=%20Id%20").lang).toBe("id");
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
