import { describe, expect, it } from "vitest";
import { R_BUMI_KM, busur, formatKoordinat, jarakKm, kakiKeMeter, knotKeKmJam, lingkaran, titikTujuan } from "@/lib/geo";

const JAKARTA: [number, number] = [106.8456, -6.2088];
const SURABAYA: [number, number] = [112.7521, -7.2575];

describe("jarakKm", () => {
  it("menghitung jarak Jakarta ke Surabaya sekitar 660 km", () => {
    const km = jarakKm(...JAKARTA, ...SURABAYA);
    expect(km).toBeGreaterThan(650);
    expect(km).toBeLessThan(675);
  });

  it("simetris dan nol untuk titik yang sama", () => {
    expect(jarakKm(...JAKARTA, ...SURABAYA)).toBeCloseTo(jarakKm(...SURABAYA, ...JAKARTA), 6);
    expect(jarakKm(...JAKARTA, ...JAKARTA)).toBe(0);
  });

  it("satu derajat bujur di khatulistiwa sekitar 111 km", () => {
    expect(jarakKm(100, 0, 101, 0)).toBeCloseTo((Math.PI / 180) * R_BUMI_KM, 3);
  });

  it("melewati garis tanggal lewat jalur pendek", () => {
    expect(jarakKm(179.5, 0, -179.5, 0)).toBeCloseTo(jarakKm(0, 0, 1, 0), 3);
  });
});

describe("titikTujuan", () => {
  it("sampai di titik yang jaraknya sesuai permintaan", () => {
    for (const arah of [0, 45, 90, 200, 315]) {
      const [lon, lat] = titikTujuan(...JAKARTA, arah, 500);
      expect(jarakKm(...JAKARTA, lon, lat)).toBeCloseTo(500, 3);
    }
  });

  it("arah 0 ke utara, arah 90 ke timur", () => {
    const utara = titikTujuan(110, 0, 0, 100);
    expect(utara[0]).toBeCloseTo(110, 6);
    expect(utara[1]).toBeGreaterThan(0);
    const timur = titikTujuan(110, 0, 90, 100);
    expect(timur[0]).toBeGreaterThan(110);
    expect(timur[1]).toBeCloseTo(0, 6);
  });

  it("menjaga bujur di rentang -180 sampai 180", () => {
    const [lon] = titikTujuan(179.9, 0, 90, 100);
    expect(lon).toBeLessThan(-179);
    expect(lon).toBeGreaterThanOrEqual(-180);
  });
});

describe("lingkaran dan busur", () => {
  it("lingkaran tertutup dan semua titiknya sejauh radius", () => {
    const ring = lingkaran(108.39, 3.94, 550, 36);
    expect(ring).toHaveLength(37);
    expect(ring[0][0]).toBeCloseTo(ring[36][0], 6);
    expect(ring[0][1]).toBeCloseTo(ring[36][1], 6);
    for (const [lon, lat] of ring) expect(jarakKm(108.39, 3.94, lon, lat)).toBeCloseTo(550, 3);
  });

  it("busur mulai dan berakhir di titik yang diminta", () => {
    const b = busur(...JAKARTA, 2.35, 48.86, 24);
    expect(b).toHaveLength(25);
    expect(b[0][0]).toBeCloseTo(JAKARTA[0], 4);
    expect(b[0][1]).toBeCloseTo(JAKARTA[1], 4);
    expect(b[24][0]).toBeCloseTo(2.35, 4);
    expect(b[24][1]).toBeCloseTo(48.86, 4);
  });

  it("busur dua titik yang sama tidak menghasilkan NaN", () => {
    const b = busur(110, -7, 110, -7);
    expect(b.flat().every(Number.isFinite)).toBe(true);
  });
});

describe("konversi dan format", () => {
  it("knot ke km/jam dan kaki ke meter", () => {
    expect(knotKeKmJam(10)).toBeCloseTo(18.52, 6);
    expect(kakiKeMeter(1000)).toBeCloseTo(304.8, 6);
  });

  it("koordinat diberi tanda belahan bumi", () => {
    expect(formatKoordinat(106.8456, -6.2088)).toBe("6.209°S 106.846°E");
    expect(formatKoordinat(-77.0365, 38.8977)).toBe("38.898°N 77.037°W");
  });
});
