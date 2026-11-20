import { describe, expect, it } from "vitest";
import { bangunBusurSipri, type DataSipri } from "@/lib/analisis";

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
});
