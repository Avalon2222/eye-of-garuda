import { afterEach, describe, expect, it, vi } from "vitest";
import type { GeoJSON } from "geojson";
import { jarakKm } from "@/lib/geo";
import { PelacakKapal, nilaiCog, nilaiSog, type KapalSnapshot, type SnapshotAis } from "@/lib/live/kapal";
import { negaraDariMmsi } from "@/lib/negara";

const T0 = Date.parse("2026-11-12T00:00:00Z");
const MENIT = 60_000;

function kapal(k: Partial<KapalSnapshot>): KapalSnapshot {
  return {
    mmsi: 525000001,
    nama: "KM UJI",
    lat: 0,
    lon: 105,
    cog: 90,
    sog: 10,
    heading: 90,
    tipe: 70,
    kelas: "kargo",
    tujuan: "BATAM",
    bendera: "",
    waktu: new Date(T0).toISOString(),
    tersanksi: false,
    ...k,
  };
}

function snapshot(daftar: KapalSnapshot[], diambil = T0): SnapshotAis {
  return { diambil: new Date(diambil).toISOString(), durasi_detik: 60, jumlah: daftar.length, kapal: daftar };
}

/** fetch palsu: URL yang memuat kunci dibalas dengan nilainya; angka berarti status HTTP tanpa isi. */
function pasangFetch(peta: Record<string, SnapshotAis | number>) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string) => {
      const kunci = Object.keys(peta).find((k) => String(url).includes(k));
      const nilai = kunci ? peta[kunci] : 404;
      if (typeof nilai === "number") return new Response("{}", { status: nilai });
      return new Response(JSON.stringify(nilai), { status: 200 });
    }),
  );
}

afterEach(() => vi.unstubAllGlobals());

describe("ekstrapolasi posisi kapal", () => {
  it("kapal 10 knot ke timur bergeser 18,52 km dalam satu jam", async () => {
    pasangFetch({ "kapal.json": snapshot([kapal({})]) });
    const p = new PelacakKapal();
    await p.muat();
    const k = p.cari(525000001)!;
    const [lon, lat] = p.posisi(k, T0 + 60 * MENIT);
    expect(jarakKm(105, 0, lon, lat)).toBeCloseTo(18.52, 2);
    expect(lon).toBeGreaterThan(105);
    expect(lat).toBeCloseTo(0, 4);
  });

  it("kapal yang nyaris diam atau tanpa haluan tidak digeser", async () => {
    pasangFetch({ "kapal.json": snapshot([kapal({ mmsi: 1, sog: 0.2 }), kapal({ mmsi: 2, cog: null }), kapal({ mmsi: 3, sog: null })]) });
    const p = new PelacakKapal();
    await p.muat();
    for (const mmsi of [1, 2, 3]) expect(p.posisi(p.cari(mmsi)!, T0 + 30 * MENIT)).toEqual([105, 0]);
  });

  it("COG 360 dan SOG 102,3 (kode AIS 'tidak tersedia') tidak menggeser kapal", async () => {
    pasangFetch({ "kapal.json": snapshot([kapal({ mmsi: 1, cog: 360 }), kapal({ mmsi: 2, sog: 102.3 })]) });
    const p = new PelacakKapal();
    await p.muat();
    for (const mmsi of [1, 2]) expect(p.posisi(p.cari(mmsi)!, T0 + 30 * MENIT)).toEqual([105, 0]);
  });

  it("ekstrapolasi berhenti di 90 menit supaya data basi tidak melantur", async () => {
    pasangFetch({ "kapal.json": snapshot([kapal({})]) });
    const p = new PelacakKapal();
    await p.muat();
    const k = p.cari(525000001)!;
    const sembilanPuluh = p.posisi(k, T0 + 90 * MENIT);
    const limaJam = p.posisi(k, T0 + 300 * MENIT);
    expect(limaJam).toEqual(sembilanPuluh);
    expect(jarakKm(105, 0, ...sembilanPuluh)).toBeCloseTo(27.78, 2);
  });

  it("waktu sebelum laporan tidak memundurkan kapal", async () => {
    pasangFetch({ "kapal.json": snapshot([kapal({})]) });
    const p = new PelacakKapal();
    await p.muat();
    const [lon, lat] = p.posisi(p.cari(525000001)!, T0 - 10 * MENIT);
    expect(lon).toBeCloseTo(105, 9);
    expect(lat).toBeCloseTo(0, 9);
  });
});

describe("gabungan snapshot dan live", () => {
  it("posisi live menimpa snapshot tanpa menghapus nama dan jenis", async () => {
    const lama = kapal({ nama: "KM LAMA", tipe: 80, kelas: "tanker", tersanksi: true, program: "UJI" });
    const baru = kapal({ nama: "", tipe: null, kelas: "lainnya", tujuan: "", lat: 1, lon: 104, waktu: new Date(T0 + 5 * MENIT).toISOString() });
    pasangFetch({ "kapal.json": snapshot([lama]), "/api/kapal": snapshot([baru], T0 + 5 * MENIT) });
    const p = new PelacakKapal();
    await p.muat();
    await p.muatLive();
    const k = p.cari(525000001)!;
    expect(k.sumber).toBe("live");
    expect([k.lon, k.lat]).toEqual([104, 1]);
    expect(k.nama).toBe("KM LAMA");
    expect(k.kelas).toBe("tanker");
    expect(k.tujuan).toBe("BATAM");
    expect(k.tersanksi).toBe(true);
    expect(p.jumlah).toBe(1);
    expect(p.jumlahLive).toBe(1);
  });

  it("kapal yang hanya ada di snapshot tetap tampil saat live masuk", async () => {
    pasangFetch({ "kapal.json": snapshot([kapal({ mmsi: 525000001 }), kapal({ mmsi: 563000002 })]), "/api/kapal": snapshot([kapal({ mmsi: 533000003 })]) });
    const p = new PelacakKapal();
    await p.muat();
    await p.muatLive();
    expect(p.jumlah).toBe(3);
    expect(p.cari(563000002)?.sumber).toBe("snapshot");
  });

  it("bendera diisi dari awalan MMSI", async () => {
    pasangFetch({ "kapal.json": snapshot([kapal({ mmsi: 525000001 }), kapal({ mmsi: 563000002 })]) });
    const p = new PelacakKapal();
    await p.muat();
    expect(p.cari(525000001)?.bendera).toBe("Indonesia");
    expect(p.cari(563000002)?.bendera).toMatch(/Singap/);
  });

  it("rute live yang membalas 503 tidak dicoba lagi", async () => {
    pasangFetch({ "kapal.json": snapshot([kapal({})]), "/api/kapal": 503 });
    const p = new PelacakKapal();
    await p.muat();
    await p.muatLive();
    await p.muatLive();
    expect(p.liveTersedia).toBe(false);
    const panggilanLive = vi.mocked(fetch).mock.calls.filter(([u]) => String(u).includes("/api/kapal"));
    expect(panggilanLive).toHaveLength(1);
  });

  it("snapshot utama gagal, cadangan lokal dipakai", async () => {
    pasangFetch({ "raw.githubusercontent.com": 500, "/data/kapal.json": snapshot([kapal({})]) });
    const p = new PelacakKapal();
    await p.muat();
    expect(p.jumlah).toBe(1);
    expect(p.galat).toBeNull();
  });

  it("hitung menghasilkan GeoJSON dengan label negara dan umur data", async () => {
    pasangFetch({ "kapal.json": snapshot([kapal({})]) });
    const p = new PelacakKapal();
    await p.muat();
    const fc = p.hitung(T0 + 30 * MENIT);
    expect(fc.features).toHaveLength(1);
    const props = fc.features[0].properties!;
    expect(props.id).toBe("kapal-525000001");
    expect(props.label).toBe("KM UJI (IDN)");
    expect(props.sumber).toBe("snapshot");
    expect(p.umurMenit(T0 + 30 * MENIT)).toBe(30);
  });
});

describe("nilai AIS untuk rute live", () => {
  it("COG 360 dan SOG 102,3 jadi null seperti di snapshot", () => {
    expect(nilaiCog(359.9)).toBe(359.9);
    expect(nilaiCog(360)).toBeNull();
    expect(nilaiCog(undefined)).toBeNull();
    expect(nilaiSog(12.4)).toBe(12.4);
    expect(nilaiSog(102.3)).toBeNull();
    expect(nilaiSog(-1)).toBeNull();
    expect(nilaiSog(Number.NaN)).toBeNull();
  });
});

describe("negara dari MMSI", () => {
  it.each([
    [525123456, "IDN"], // kapal biasa
    [985251234, "IDN"], // kapal kecil milik kapal induk
    [995631234, "SGP"], // alat bantu navigasi
    [853312345, "MYS"], // VHF genggam
    ["005251234", "IDN"], // stasiun pantai
    [111525123, "IDN"], // pesawat SAR
  ])("%s -> %s", (mmsi, kode) => {
    expect(negaraDariMmsi(mmsi)?.kode).toBe(kode);
  });
});

describe("waktu laporan kapal yang rusak", () => {
  it("kapal tetap di posisi terakhirnya, bukan NaN", async () => {
    pasangFetch({ "kapal.json": snapshot([kapal({ waktu: "bukan-waktu" }), kapal({ mmsi: 2, waktu: "" })]) });
    const p = new PelacakKapal();
    await p.muat();
    expect(p.posisi(p.cari(525000001)!, T0 + 30 * MENIT)).toEqual([105, 0]);
    expect(p.posisi(p.cari(2)!, T0 + 30 * MENIT)).toEqual([105, 0]);
    const titik = p.hitung(T0).features.map((f) => (f.geometry as GeoJSON.Point).coordinates);
    expect(titik.flat().every(Number.isFinite)).toBe(true);
  });
});

describe("umur data kapal", () => {
  it("waktu diambil yang rusak memberi null, bukan NaN", async () => {
    pasangFetch({ "kapal.json": { ...snapshot([kapal({})]), diambil: "kemarin" } });
    const p = new PelacakKapal();
    await p.muat();
    expect(p.umurMenit(T0 + 30 * MENIT)).toBeNull();
  });

  it("waktu diambil yang benar tetap dihitung", async () => {
    pasangFetch({ "kapal.json": snapshot([kapal({})]) });
    const p = new PelacakKapal();
    await p.muat();
    expect(p.umurMenit(T0 + 30 * MENIT)).toBe(30);
  });
});

describe("koordinat kapal yang rusak", () => {
  it("posisi live rusak tidak menimpa posisi snapshot", async () => {
    const lama = kapal({ lat: 1, lon: 104 });
    const rusak = kapal({ lat: Number.NaN, lon: 104, waktu: new Date(T0 + 5 * MENIT).toISOString() });
    pasangFetch({ "kapal.json": snapshot([lama, kapal({ mmsi: 2, lat: 95, lon: 104 })]), "/api/kapal": snapshot([rusak], T0 + 5 * MENIT) });
    const p = new PelacakKapal();
    await p.muat();
    await p.muatLive();
    const k = p.cari(525000001)!;
    expect([k.lon, k.lat]).toEqual([104, 1]);
    expect(k.sumber).toBe("snapshot");
    expect(p.cari(2)).toBeUndefined();   // lat 95 dari snapshot juga dibuang
  });
});

describe("laporan live yang lebih tua dari snapshot", () => {
  it("posisi snapshot yang lebih baru dipertahankan", async () => {
    const baru = kapal({ lat: 1, lon: 104, waktu: new Date(T0 + 20 * MENIT).toISOString() });
    const basi = kapal({ lat: 2, lon: 103, waktu: new Date(T0 + 5 * MENIT).toISOString() });
    pasangFetch({ "kapal.json": snapshot([baru], T0 + 20 * MENIT), "/api/kapal": snapshot([basi], T0 + 25 * MENIT) });
    const p = new PelacakKapal();
    await p.muat();
    await p.muatLive();
    const k = p.cari(525000001)!;
    expect([k.lon, k.lat]).toEqual([104, 1]);
    expect(k.sumber).toBe("snapshot");
  });
});

describe("MMSI dobel di snapshot", () => {
  it("laporan terbaru yang dipakai, bukan baris terakhir", async () => {
    const baru = kapal({ lat: 1, lon: 104, waktu: new Date(T0 + 20 * MENIT).toISOString() });
    const lama = kapal({ lat: 2, lon: 103, waktu: new Date(T0 + 5 * MENIT).toISOString() });
    pasangFetch({ "kapal.json": snapshot([baru, lama], T0 + 25 * MENIT) });
    const p = new PelacakKapal();
    await p.muat();
    expect(p.jumlah).toBe(1);
    const k = p.cari(525000001)!;
    expect([k.lon, k.lat]).toEqual([104, 1]);
  });
});
