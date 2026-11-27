import { describe, expect, it } from "vitest";
import { jarakKm } from "@/lib/geo";
import { PelacakPesawat, type FixPesawat } from "@/lib/live/pesawat";

const T0 = Date.parse("2026-11-19T00:00:00Z");

function fix(f: Partial<FixPesawat> = {}): FixPesawat {
  return {
    hex: "ae1234",
    callsign: "UJI01",
    reg: "",
    tipe: "P8",
    lat: 0,
    lon: 110,
    alt: 30000,
    gs: 450,
    track: 90,
    squawk: "",
    dilihat: T0,
    ...f,
  };
}

describe("ekstrapolasi posisi pesawat", () => {
  it("pesawat 450 knot bergeser sesuai waktu sejak fix", () => {
    const p = new PelacakPesawat();
    p.perbarui([fix()], T0);
    const [d] = p.daftar(T0 + 60_000);
    expect(jarakKm(110, 0, d.lon, d.lat)).toBeCloseTo(450 * 1.852 / 60, 1);
  });

  it("fix yang basi (API gagal terus) tidak membuat pesawat melantur tanpa batas", () => {
    const p = new PelacakPesawat();
    p.perbarui([fix()], T0);
    const [batas] = p.daftar(T0 + 150_000);
    const [satuJam] = p.daftar(T0 + 3_600_000);
    expect(satuJam.lon).toBeCloseTo(batas.lon, 9);
    expect(jarakKm(110, 0, satuJam.lon, satuJam.lat)).toBeLessThan(40);
  });
});

describe("waktu fix pesawat yang rusak", () => {
  it("posisi tetap angka dan pesawat tetap dihapus setelah lama tidak terlihat", () => {
    const p = new PelacakPesawat();
    p.perbarui([fix({ dilihat: Number.NaN })], T0);
    const [d] = p.daftar(T0 + 60_000);
    expect(Number.isFinite(d.lon) && Number.isFinite(d.lat)).toBe(true);
    expect(jarakKm(110, 0, d.lon, d.lat)).toBeCloseTo(450 * 1.852 / 60, 1);
    p.perbarui([], T0 + 10 * 60_000);
    expect(p.jumlah).toBe(0);
  });
});

describe("posisi fix pesawat yang rusak", () => {
  it("fix tanpa koordinat sah dilewati, posisi lama dipertahankan", () => {
    const p = new PelacakPesawat();
    p.perbarui([fix(), fix({ hex: "ae9999", lat: Number.NaN })], T0);
    expect(p.jumlah).toBe(1);
    p.perbarui([fix({ lat: 95, lon: 110, dilihat: T0 + 10_000 })], T0 + 10_000);
    const s = p.cari("ae1234")!;
    expect(s.lat).toBe(0);
    expect(s.jejak.every(([lon, lat]) => Number.isFinite(lon) && Math.abs(lat) <= 90)).toBe(true);
  });
});
