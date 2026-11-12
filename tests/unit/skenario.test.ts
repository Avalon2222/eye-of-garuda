import { describe, expect, it } from "vitest";
import { jarakKm } from "@/lib/geo";
import { LAPISAN } from "@/lib/layers";
import { SKENARIO, haluanDeg, hitungAngka, jejakJalur, posisiJalur, skenarioDariId, skenarioKeMarkdown } from "@/lib/skenario";
import { bacaData } from "./bantu";

const ID_LAPISAN = new Set<string>(LAPISAN.map((l) => l.id));

function titikSah([lon, lat]: [number, number]): boolean {
  return Number.isFinite(lon) && Number.isFinite(lat) && Math.abs(lon) <= 180 && Math.abs(lat) <= 90;
}

describe("definisi skenario", () => {
  it("ada tiga skenario dengan id unik yang bisa dicari", () => {
    expect(SKENARIO).toHaveLength(3);
    expect(new Set(SKENARIO.map((s) => s.id)).size).toBe(3);
    for (const s of SKENARIO) expect(skenarioDariId(s.id)).toBe(s);
    expect(skenarioDariId("tidak-ada")).toBeUndefined();
  });

  it.each(SKENARIO.map((s) => [s.id, s] as const))("%s: judul, fase, kesimpulan, dan saran lengkap dalam dua bahasa", (_id, s) => {
    for (const teks of [s.judul, s.sub]) {
      expect(teks.id.trim()).not.toBe("");
      expect(teks.en.trim()).not.toBe("");
    }
    expect(s.fase.length).toBeGreaterThanOrEqual(3);
    expect(new Set(s.fase.map((f) => f.kode)).size).toBe(s.fase.length);
    for (const f of s.fase) {
      expect(f.judul.id && f.judul.en && f.teks.id && f.teks.en).toBeTruthy();
      expect(f.tahan).toBeGreaterThan(0);
    }
    expect(s.kesimpulan.id.length).toBeGreaterThan(0);
    expect(s.kesimpulan.en).toHaveLength(s.kesimpulan.id.length);
    expect(s.saran.en).toHaveLength(s.saran.id.length);
  });

  it.each(SKENARIO.map((s) => [s.id, s] as const))("%s: lapisan, kamera, dan jalur aktor masuk akal", (_id, s) => {
    for (const l of s.lapisan) expect(ID_LAPISAN.has(l)).toBe(true);
    for (const f of s.fase) {
      for (const l of f.nyalakan ?? []) expect(ID_LAPISAN.has(l)).toBe(true);
      expect(titikSah(f.kamera.center)).toBe(true);
      expect(f.kamera.zoom).toBeGreaterThan(0);
      expect(new Set(f.aktor.map((a) => a.id)).size).toBe(f.aktor.length);
      for (const a of f.aktor) {
        expect(a.jalur.length).toBeGreaterThan(0);
        expect(a.jalur.every(titikSah)).toBe(true);
        expect(a.mulai).toBeGreaterThanOrEqual(0);
        expect(a.durasi).toBeGreaterThan(0);
        expect(a.label.id && a.label.en).toBeTruthy();
      }
      for (const g of f.garis ?? []) expect(g.jalur.every(titikSah)).toBe(true);
      for (const c of f.lingkaran ?? []) expect(c.radiusKm).toBeGreaterThan(0);
    }
  });

  it("kabel yang diputus di skenario benar-benar ada di data kabel", () => {
    const kabel = bacaData<{ features: { properties: { id: string } }[] }>("kabel.geojson");
    const dikenal = new Set(kabel.features.map((f) => f.properties.id));
    const dipakai = SKENARIO.flatMap((s) => s.fase.flatMap((f) => f.kabelPutus ?? []));
    expect(dipakai.length).toBeGreaterThan(0);
    for (const id of dipakai) expect(dikenal.has(id), id).toBe(true);
  });
});

describe("interpolasi jalur", () => {
  const A: [number, number] = [105, 0];
  const B: [number, number] = [115, 0];
  const C: [number, number] = [115, 10];

  it("mulai di titik awal dan berakhir di titik akhir", () => {
    const awal = posisiJalur([A, B, C], 0);
    const akhir = posisiJalur([A, B, C], 1);
    expect([awal.lon, awal.lat]).toEqual([105, 0]);
    expect(akhir.lon).toBeCloseTo(115, 6);
    expect(akhir.lat).toBeCloseTo(10, 6);
  });

  it("separuh jalan berarti separuh jarak, bukan separuh jumlah titik", () => {
    const total = jarakKm(...A, ...B) + jarakKm(...B, ...C);
    const tengah = posisiJalur([A, B, C], 0.5);
    const sudahDitempuh = tengah.lat > 1e-6 ? jarakKm(...A, ...B) + jarakKm(...B, tengah.lon, tengah.lat) : jarakKm(...A, tengah.lon, tengah.lat);
    expect(sudahDitempuh).toBeCloseTo(total / 2, 0);
  });

  it("fraksi di luar 0..1 dijepit, jalur satu titik tetap diam", () => {
    expect(posisiJalur([A, B], -1).lon).toBeCloseTo(105, 6);
    expect(posisiJalur([A, B], 2).lon).toBeCloseTo(115, 6);
    expect(posisiJalur([A], 0.7)).toEqual({ lon: 105, lat: 0, haluan: 0 });
  });

  it("haluan: timur 90, utara 0, barat 270", () => {
    expect(haluanDeg(A, B)).toBeCloseTo(90, 3);
    expect(haluanDeg(B, C)).toBeCloseTo(0, 3);
    expect(haluanDeg(B, A)).toBeCloseTo(270, 3);
    expect(posisiJalur([A, B], 0.3).haluan).toBeCloseTo(90, 1);
  });

  it("jejak berisi n+1 titik dari awal sampai posisi sekarang", () => {
    const jejak = jejakJalur([A, B], 0.5, 10);
    expect(jejak).toHaveLength(11);
    expect(jejak[0]).toEqual([105, 0]);
    expect(jejak[10][0]).toBeCloseTo(110, 3);
  });
});

describe("angka dan ekspor skenario", () => {
  it("nilai tetap dipakai apa adanya", () => {
    expect(hitungAngka({ label: { id: "a", en: "a" }, nilai: "22" }, "id")).toBe("22");
  });

  it("jarak dihitung dari koordinat, waktu tempuh dari kecepatan", () => {
    const dasar = { label: { id: "a", en: "a" }, dari: [105, 0] as [number, number], ke: [115, 0] as [number, number] };
    expect(hitungAngka(dasar, "id")).toBe("1,112 km");
    expect(hitungAngka({ ...dasar, kecepatanKmJam: 900 }, "id")).toBe("1,112 km · ±74 menit");
    expect(hitungAngka({ ...dasar, kecepatanKmJam: 900 }, "en")).toBe("1,112 km · ±74 min");
    expect(hitungAngka({ ...dasar, kecepatanKmJam: 37 }, "id")).toBe("1,112 km · ±30.1 jam");
    expect(hitungAngka({ ...dasar, kecepatanKmJam: 10 }, "en")).toBe("1,112 km · ±4.6 days");
  });

  it("ekspor Markdown memuat semua fase dan penafian fiktif", () => {
    for (const s of SKENARIO) {
      for (const lang of ["id", "en"] as const) {
        const md = skenarioKeMarkdown(s, lang);
        expect(md.startsWith(`# ${s.judul[lang]}`)).toBe(true);
        for (const f of s.fase) expect(md).toContain(f.judul[lang]);
        expect(md).toMatch(lang === "id" ? /fiktif/i : /fictional/i);
      }
    }
  });
});
