import { describe, expect, it } from "vitest";
import { R_BUMI_KM, bungkusBujur, busur, formatKoordinat, jarakKm, kakiKeMeter, knotKeKmJam, lingkaran, titikTujuan } from "@/lib/geo";

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

  it("bujur asal di luar -180..180 tetap menghasilkan bujur normal", () => {
    const [lon, lat] = titikTujuan(106.8 + 720, -6.2, 0, 10);
    expect(lon).toBeCloseTo(106.8, 6);
    expect(jarakKm(106.8, -6.2, lon, lat)).toBeCloseTo(10, 3);
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

  it("busur yang melintasi garis tanggal tetap bersambung", () => {
    const b = busur(-77.0, 38.9, 106.8, -6.2, 64); // Washington -> Jakarta, lewat Pasifik
    for (let i = 1; i < b.length; i++) expect(Math.abs(b[i][0] - b[i - 1][0])).toBeLessThan(90);
    expect(b[64][0]).toBeCloseTo(106.8, 4);
    expect(b[64][1]).toBeCloseTo(-6.2, 4);
    // titik asal sama tempatnya, hanya ditulis dengan bujur yang digeser 360 derajat
    expect((((b[0][0] + 180) % 360) + 360) % 360 - 180).toBeCloseTo(-77.0, 4);
    expect(b[0][1]).toBeCloseTo(38.9, 4);
  });

  it.each([
    [0, 0, 180, 0],
    [106.8, -6.2, -73.2, 6.2], // Jakarta -> antipodanya
    [106.8, -6.2, -73.2000001, 6.2],
  ])("busur ke titik antipoda tetap rata dan sampai tujuan (%s, %s -> %s, %s)", (lon1, lat1, lon2, lat2) => {
    const n = 8;
    const b = busur(lon1, lat1, lon2, lat2, n);
    expect(b).toHaveLength(n + 1);
    const total = jarakKm(lon1, lat1, lon2, lat2);
    // tiap titik maju sama jauh di sepanjang busur, tidak menumpuk di satu tempat
    b.forEach(([lon, lat], i) => expect(jarakKm(lon1, lat1, lon, lat)).toBeCloseTo((total * i) / n, -1));
    expect(jarakKm(lon2, lat2, ...b[n])).toBeLessThan(0.001);
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
    expect(formatKoordinat(-0.0001, -0.0004)).toBe("0.000°N 0.000°E");
  });

  it("bujur dari salinan dunia (peta 2D) dibungkus ke -180..180", () => {
    expect(formatKoordinat(466.8456, -6.2088)).toBe("6.209°S 106.846°E");
    expect(formatKoordinat(-253.1544, -6.2088)).toBe("6.209°S 106.846°E");
    expect(bungkusBujur(180)).toBe(180);
    expect(bungkusBujur(-180)).toBe(-180);
    expect(bungkusBujur(540)).toBe(180);
    expect(bungkusBujur(-190)).toBeCloseTo(170, 9);
  });
});

describe("formatKoordinat tanpa angka", () => {
  it("koordinat NaN atau tak hingga jadi strip", () => {
    expect(formatKoordinat(Number.NaN, -6.2)).toBe("-");
    expect(formatKoordinat(106.8, Number.POSITIVE_INFINITY)).toBe("-");
  });
});
