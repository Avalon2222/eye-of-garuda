import { describe, expect, it } from "vitest";
import { arahKompas, cariObjek, hitung, jalankanAlat, jarak, selesaikanTempat, terdekat } from "@/lib/chat/alat";
import { LAPISAN_CHAT, bangunIndeks, cocokNegara, normal } from "@/lib/chat/indeks";
import { jarakKm } from "@/lib/geo";
import { LAPISAN } from "@/lib/layers";
import { bacaData, indeksAsli } from "./bantu";

const indeks = indeksAsli();

describe("indeks objek", () => {
  it("jumlah per lapisan sama dengan isi berkas GeoJSON", () => {
    const tni = bacaData<{ features: unknown[] }>("markas_tni.geojson").features.length;
    const asing = bacaData<{ features: unknown[] }>("pangkalan_asing.geojson").features.length;
    expect(indeks.filter((o) => o.lapisan === "tni")).toHaveLength(tni);
    expect(indeks.filter((o) => o.lapisan === "asing")).toHaveLength(asing);
    for (const l of LAPISAN_CHAT) expect(indeks.some((o) => o.lapisan === l), l).toBe(true);
  });

  it("lapisan chat menunjuk ke lapisan antarmuka yang ada (landing ikut kabel)", () => {
    const dikenal = new Set<string>(LAPISAN.map((l) => l.id));
    for (const l of LAPISAN_CHAT) expect(dikenal.has(l === "landing" ? "kabel" : l), l).toBe(true);
  });

  it("fitur tanpa nama atau koleksi rusak dilewati", () => {
    const hasil = bangunIndeks({ tni: { features: [{ properties: { nama: "" } }, { properties: null }, { properties: { nama: "Lanud Uji" }, geometry: { type: "Point", coordinates: [110, -7] } }] }, asing: {} });
    expect(hasil).toHaveLength(1);
    expect(hasil[0]).toMatchObject({ nama: "Lanud Uji", lon: 110, lat: -7, negara: "Indonesia" });
  });

  it("normalisasi nama dan negara", () => {
    expect(normal("Lanal Ranai (Natuna)")).toBe("lanal ranai natuna");
    expect(cocokNegara("Amerika Serikat", "USA")).toBe(true);
    expect(cocokNegara("Guam (AS)", "Amerika Serikat")).toBe(true);
    expect(cocokNegara("Philippines", "Filipina")).toBe(true);
    expect(cocokNegara("Tiongkok", "China")).toBe(true);
    expect(cocokNegara("Australia", "Austria")).toBe(false);
  });
});

describe("selesaikanTempat", () => {
  it("mengenali tempat umum, objek di peta, dan koordinat", () => {
    expect(selesaikanTempat(indeks, "Natuna")).toMatchObject({ asal: "tempat" });
    expect(selesaikanTempat(indeks, "Selat Malaka")?.asal).toBe("tempat");
    expect(selesaikanTempat(indeks, "Lanud Raden Sadjad")).toMatchObject({ nama: "Lanud Raden Sadjad", asal: "objek" });
    expect(selesaikanTempat(indeks, "Fiery Cross")?.nama).toBe("Fiery Cross Reef");
    expect(selesaikanTempat(indeks, "3.9, 108.4")).toMatchObject({ lat: 3.9, lon: 108.4, asal: "koordinat" });
  });

  it("mode ketat tidak menebak dari kata umum", () => {
    expect(selesaikanTempat(indeks, "lanud", { ketat: true })).toBeNull();
    expect(selesaikanTempat(indeks, "qwertyuiop", { ketat: true })).toBeNull();
    expect(selesaikanTempat(indeks, "")).toBeNull();
  });
});

describe("alat terdekat", () => {
  it("urut dari yang paling dekat dan cocok dengan hitungan manual", () => {
    const r = terdekat(indeks, { dari: "Natuna", lapisan: "asing", jumlah: 5 });
    expect(r.dari?.nama).toMatch(/Natuna/);
    expect(r.hasil).toHaveLength(5);
    const km = r.hasil.map((h) => h.km);
    expect(km).toEqual([...km].sort((a, b) => a - b));
    // hitung ulang tanpa alat: jarak minimum dari Natuna ke semua pangkalan asing
    const minimum = Math.min(...indeks.filter((o) => o.lapisan === "asing" && o.lon != null).map((o) => jarakKm(r.dari!.lon, r.dari!.lat, o.lon!, o.lat!)));
    expect(km[0]).toBe(Math.round(minimum));
  });

  it("saringan negara dan jenis dipatuhi", () => {
    const china = terdekat(indeks, { dari: "Natuna", lapisan: "asing", negara: "Tiongkok", jumlah: 3 });
    expect(china.hasil.length).toBeGreaterThan(0);
    for (const h of china.hasil) expect(`${h.negara} ${h.catatan}`).toMatch(/China/);
    const lanud = terdekat(indeks, { dari: "Darwin", lapisan: "tni", jenis: "Lanud", jumlah: 3 });
    for (const h of lanud.hasil) expect(h.jenis).toBe("Lanud");
    const bukanSingapura = terdekat(indeks, { dari: "Natuna", lapisan: "asing", kecualiNegara: "Singapore", jumlah: 5 });
    for (const h of bukanSingapura.hasil) expect(h.negara).not.toBe("Singapura");
  });

  it("objek asal tidak ikut jadi hasil, nama kembar muncul sekali", () => {
    const r = terdekat(indeks, { dari: "Lanal Tarempa", lapisan: "tni", jumlah: 10 });
    const nama = r.hasil.map((h) => h.nama);
    expect(nama).not.toContain("Lanal Tarempa");
    expect(new Set(nama.map(normal)).size).toBe(nama.length);
  });

  it("tempat yang tidak dikenal dibalas galat, bukan hasil ngawur", () => {
    expect(terdekat(indeks, { dari: "zzzzqqqq", lapisan: "tni" })).toEqual({ dari: null, galat: "tempat_tidak_dikenal", hasil: [] });
  });
});

describe("alat hitung, cari, jarak", () => {
  it("jumlah per lapisan dan rincian per kelompok konsisten", () => {
    const semua = hitung(indeks, { lapisan: "tni", kelompok: "matra" });
    expect(semua.total).toBe(indeks.filter((o) => o.lapisan === "tni").length);
    expect(semua.rincian!.reduce((a, [, n]) => a + n, 0)).toBe(semua.total);
    expect(semua.rincian!.map(([k]) => k).sort()).toEqual(expect.arrayContaining(["AD", "AL", "AU"]));
  });

  it("saringan wilayah mencakup semua provinsi Papua", () => {
    const papua = hitung(indeks, { lapisan: "tni", saring: "Papua", kelompok: "wilayah" });
    const manual = indeks.filter((o) => o.lapisan === "tni" && /papua/i.test(o.wilayah)).length;
    expect(manual).toBeGreaterThan(0);
    expect(papua.total).toBe(manual);
    for (const [wilayah] of papua.rincian!) expect(wilayah).toMatch(/Papua/);
  });

  it("cariObjek menaruh Lanud di Ranai paling atas untuk 'Lanud Ranai'", () => {
    const hasil = cariObjek(indeks, "Lanud Ranai");
    expect(hasil[0]).toMatchObject({ lapisan: "tni", jenis: "Lanud" });
    expect(hasil[0].wilayah).toBe("Kepulauan Riau");
    expect(cariObjek(indeks, "Changi", { lapisan: "kapalselam" })[0].nama).toMatch(/Changi/);
    expect(cariObjek(indeks, "xyzxyz")).toEqual([]);
  });

  it("jarak dua tempat sama dengan rumus haversine", () => {
    const r = jarak(indeks, "Jakarta", "Darwin");
    expect(r.km).toBe(Math.round(jarakKm(r.dari!.lon, r.dari!.lat, r.ke!.lon, r.ke!.lat)));
    expect(r.km).toBeGreaterThan(2600);
    expect(r.km).toBeLessThan(2800);
    expect(r.mil_laut).toBe(Math.round(r.km! / 1.852));
    expect(jarak(indeks, "Jakarta", "zzzzqqqq").galat).toBe("tempat_tidak_dikenal");
  });

  it("arah kompas", () => {
    expect(arahKompas(110, 0, 110, 5)).toBe("utara");
    expect(arahKompas(110, 0, 115, 0)).toBe("timur");
    expect(arahKompas(110, 0, 105, -5)).toBe("barat daya");
  });
});

describe("jalankanAlat (dipanggil model)", () => {
  it("menerjemahkan nama alat dan argumen", () => {
    const r = jalankanAlat(indeks, "terdekat", { dari: "Natuna", lapisan: "asing", jumlah: "2" }) as { hasil: unknown[] };
    expect(r.hasil).toHaveLength(2);
    expect(jalankanAlat(indeks, "hitung", { lapisan: "kabel" })).toMatchObject({ lapisan: "kabel" });
    expect((jalankanAlat(indeks, "cari_objek", { kueri: "Fiery Cross" }) as { jumlah: number }).jumlah).toBeGreaterThan(0);
    expect(jalankanAlat(indeks, "jarak", { dari: "Batam", ke: "Singapura" })).toHaveProperty("km");
  });

  it("argumen ngawur dibalas galat tanpa melempar", () => {
    expect(jalankanAlat(indeks, "terdekat", { dari: "Natuna", lapisan: "bulan" })).toEqual({ galat: "argumen_salah" });
    expect(jalankanAlat(indeks, "hitung", null)).toEqual({ galat: "argumen_salah" });
    expect(jalankanAlat(indeks, "cari_objek", { kueri: 42 })).toEqual({ galat: "argumen_salah" });
    expect(jalankanAlat(indeks, "hapus_semua", {})).toEqual({ galat: "alat_tidak_dikenal" });
  });
});
