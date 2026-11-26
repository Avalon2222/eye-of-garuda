import { describe, expect, it } from "vitest";
import { bangunBusurSipri, barisLegendaSipri, formatTiv, pilihSipri, type DataSipri } from "@/lib/analisis";

function data(tiv: number[]): DataSipri {
  return {
    tujuan: { nama: "Jakarta", lat: -6.2, lon: 106.8 },
    periode: "2020-2024",
    satuan: "juta TIV",
    total_tiv_juta: tiv.reduce((a, b) => a + b, 0),
    catatan: "uji",
    pemasok: tiv.map((t, i) => ({ negara: `N${i}`, lat: 10 + i, lon: 100 + i, tiv_juta: t, persen: 0, contoh: "-", sumber: "-", url: "" })) as DataSipri["pemasok"],
  };
}

describe("bangunBusurSipri", () => {
  it("tebal garis sebanding dengan TIV, pemasok terbesar paling tebal", () => {
    const { garis } = bangunBusurSipri(data([100, 50]));
    const tebal = garis.features.map((f) => f.properties?.tebal as number);
    expect(tebal[0]).toBeCloseTo(10, 6);
    expect(tebal[1]).toBeCloseTo(5.5, 6);
  });

  it("semua TIV nol tidak menghasilkan tebal NaN", () => {
    const { garis } = bangunBusurSipri(data([0, 0]));
    for (const f of garis.features) expect(f.properties?.tebal).toBe(1);
  });

  it("TIV kosong (null) tidak menggagalkan lapisan", () => {
    const d = data([100, 0]);
    (d.pemasok[1] as { tiv_juta: unknown }).tiv_juta = null;
    const { garis } = bangunBusurSipri(d);
    expect(garis.features[1].properties?.tebal).toBe(1);
    expect(garis.features[1].properties?.tiv).toBe(0);
    expect(garis.features[1].properties?.sub).toContain("? juta TIV");
    expect(garis.features[0].properties?.tebal).toBeCloseTo(10, 6);
  });

  it("persen kosong tidak tampil sebagai null%", () => {
    const d = data([100, 50]);
    (d.pemasok[1] as { persen: unknown }).persen = null;
    const { garis, titik } = bangunBusurSipri(d);
    expect(titik.features[1].properties?.label).toBe("N1");
    expect(titik.features[0].properties?.label).toBe("N0 0%");
    expect(garis.features[1].properties?.sub).not.toContain("null");
  });

  it("pemasok tanpa koordinat dilewati, sisanya tetap tergambar", () => {
    const d = data([100, 50, 20]);
    (d.pemasok[1] as { lat: unknown }).lat = null;
    const { garis, titik } = bangunBusurSipri(d);
    expect(garis.features.map((f) => f.properties?.negara)).toEqual(["N0", "N2"]);
    expect(titik.features).toHaveLength(2);
    for (const f of garis.features) {
      for (const [x, y] of (f.geometry as GeoJSON.LineString).coordinates) expect(Number.isFinite(x) && Number.isFinite(y)).toBe(true);
    }
  });
});

describe("barisLegendaSipri", () => {
  it("urut dari TIV terbesar dengan lebar batang relatif", () => {
    const baris = barisLegendaSipri(data([50, 100]));
    expect(baris.map((b) => b.pemasok.negara)).toEqual(["N1", "N0"]);
    expect(baris.map((b) => b.lebar)).toEqual([100, 50]);
  });

  it("TIV kosong ditaruh paling bawah dan lebarnya 0, bukan NaN", () => {
    const d = data([0, 80, 40]);
    (d.pemasok[0] as { tiv_juta: unknown }).tiv_juta = null;
    const baris = barisLegendaSipri(d);
    expect(baris.map((b) => b.pemasok.negara)).toEqual(["N1", "N2", "N0"]);
    expect(baris.map((b) => b.lebar)).toEqual([100, 50, 0]);
  });

  it("semua TIV nol tidak membuat lebar NaN", () => {
    for (const b of barisLegendaSipri(data([0, 0]))) expect(b.lebar).toBe(0);
  });
});

describe("formatTiv", () => {
  it("angka diberi pemisah ribuan, kosong jadi tanda tanya", () => {
    expect(formatTiv(12345)).toBe("12,345");
    expect(formatTiv(null)).toBe("?");
    expect(formatTiv(undefined)).toBe("?");
    expect(formatTiv(Number.NaN)).toBe("?");
  });
});

describe("pilihSipri", () => {
  it("berkas cabang data tanpa tujuan jatuh ke versi lokal, bukan menggagalkan lapisan", () => {
    const lokal = data([100]);
    const rusak = { ...data([50]), tujuan: undefined } as unknown as DataSipri;
    const pilih = pilihSipri(rusak, lokal);
    expect(pilih).toBe(lokal);
    expect(() => bangunBusurSipri(pilih!)).not.toThrow();
  });

  it("versi cabang data yang sah tetap diutamakan", () => {
    const raw = data([70]);
    expect(pilihSipri(raw, data([100]))).toBe(raw);
    expect(pilihSipri({ ...raw, pemasok: [] }, null)).toBeNull();
  });
});
