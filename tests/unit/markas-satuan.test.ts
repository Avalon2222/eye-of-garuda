/**
 * Kodim & Yonif (EOG-39): satuan level bawah di lapisan markas TNI yang baru muncul di zoom dekat.
 */

import { describe, expect, it } from "vitest";
import { terdekat } from "@/lib/chat/alat";
import { bacaData, indeksAsli } from "./bantu";

interface Fitur {
  properties: Record<string, string | number>;
  geometry: { coordinates: [number, number] };
}

const fitur = bacaData<{ features: Fitur[] }>("markas_tni.geojson").features;
const satuan = fitur.filter((f) => f.properties.jenis === "Kodim" || f.properties.jenis === "Yonif");

describe("Kodim dan Yonif di lapisan markas", () => {
  it("ada ratusan Kodim dan Yonif, semuanya peringkat 3", () => {
    expect(fitur.filter((f) => f.properties.jenis === "Kodim").length).toBeGreaterThan(300);
    expect(fitur.filter((f) => f.properties.jenis === "Yonif").length).toBeGreaterThan(300);
    for (const f of satuan) expect(f.properties.peringkat).toBe(3);
  });

  it("markas utama tetap peringkat 1 atau 2", () => {
    for (const f of fitur.filter((f) => !satuan.includes(f))) expect([1, 2]).toContain(f.properties.peringkat);
  });

  it("id unik dan koordinat di dalam Indonesia", () => {
    const id = fitur.map((f) => f.properties.id);
    expect(new Set(id).size).toBe(id.length);
    for (const f of satuan) {
      const [lon, lat] = f.geometry.coordinates;
      expect(lon, String(f.properties.nama)).toBeGreaterThan(94);
      expect(lon, String(f.properties.nama)).toBeLessThan(141.1);
      expect(lat, String(f.properties.nama)).toBeGreaterThan(-11.2);
      expect(lat, String(f.properties.nama)).toBeLessThan(6.2);
    }
  });

  it("tiap titik punya sumber dan tingkat presisi", () => {
    for (const f of satuan) {
      expect(["osm", "kota"]).toContain(f.properties.presisi);
      expect(String(f.properties.url)).toMatch(/^https:\/\/id\.wikipedia\.org\//);
      expect(String(f.properties.provinsi).length, String(f.properties.nama)).toBeGreaterThan(2);
    }
  });

  it("Papua Pegunungan gak kosong lagi", () => {
    const n = fitur.filter((f) => f.properties.provinsi === "Papua Pegunungan").length;
    expect(n).toBeGreaterThan(0);
  });

  it("chatbot bisa cari Kodim terdekat dari Wamena", () => {
    const r = terdekat(indeksAsli(), { dari: "-4.09, 138.94", lapisan: "tni", jenis: "Kodim", jumlah: 1 });
    expect(r.hasil[0]?.nama).toMatch(/^Kodim 1702/);
    expect(r.hasil[0]?.km).toBeLessThan(15);
  });
});
