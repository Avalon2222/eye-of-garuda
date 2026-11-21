import { describe, expect, it } from "vitest";
import { cariEntri, skorCari, type EntriCari } from "@/lib/cari";
import { urutkanCalon, type CalonKlik } from "@/lib/klik";
import { lapisanDariTombol, LAPISAN } from "@/lib/layers";
import { formatEpochTle, tanggalEpochTle } from "@/lib/waktu";
import type { LayerId } from "@/lib/layers";

function entri(lapisan: LayerId, nama: string, sub = ""): EntriCari {
  return { id: `${lapisan}-${nama}`, lapisan, nama, sub, lon: 0, lat: 0, props: { id: `${lapisan}-${nama}`, nama } };
}

describe("pencarian (EOG-17)", () => {
  const indeks = [
    entri("kabel", "Natuna, Indonesia", "Indonesia"),
    entri("bandara", "Ranai Airport", "Natuna"),
    entri("insiden", "Penamaan Laut Natuna Utara", "insiden"),
    entri("tni", "Lanal Ranai (Natuna)", "Lanal"),
    entri("batas", "Laut Natuna Utara", "wilayah_rawan"),
    entri("pelabuhan", "Natuna Port"),
  ];

  it("wilayah > markas > insiden > fasilitas untuk 'natuna'", () => {
    expect(cariEntri("natuna", indeks).map((e) => e.lapisan)).toEqual(["batas", "tni", "insiden", "pelabuhan", "kabel", "bandara"]);
  });

  it("kata kunci kosong tetap mengikuti batas maks", () => {
    expect(cariEntri("", indeks, 3)).toHaveLength(3);
    expect(cariEntri("   ", indeks)).toHaveLength(indeks.length);
  });

  it("maks negatif tidak mengembalikan hampir semua entri", () => {
    expect(cariEntri("natuna", indeks, -1)).toEqual([]);
    expect(cariEntri("", indeks, -2)).toEqual([]);
    expect(cariEntri("natuna", indeks, 2.7)).toHaveLength(2);
  });

  it("nama persis selalu paling atas, termasuk tanpa keterangan dalam kurung", () => {
    expect(cariEntri("natuna port", indeks)[0].nama).toBe("Natuna Port");
    expect(cariEntri("Lanal Ranai", indeks)[0].nama).toBe("Lanal Ranai (Natuna)");
  });

  it("cocok di nama mengalahkan cocok di keterangan, huruf besar dan aksen diabaikan", () => {
    expect(skorCari("NATUNA", entri("kabel", "Natuna, Indonesia"))).toBeGreaterThan(skorCari("natuna", entri("tni", "Lanud X", "Natuna")));
    expect(skorCari("sao", entri("bandara", "São Tomé"))).toBeGreaterThan(0);
    expect(cariEntri("zzzz", indeks)).toEqual([]);
  });
});

describe("klik objek yang numpuk (EOG-02)", () => {
  const calon = (lapisan: LayerId, id: string, d2: number): CalonKlik => ({ pilihan: { lapisan, props: { id }, lon: 0, lat: 0 }, d2 });

  it("urut markas TNI > pangkalan asing > bandara > pelabuhan > kabel, lalu jarak", () => {
    const hasil = urutkanCalon([calon("kabel", "landing-ternate", 1), calon("pelabuhan", "p1", 2), calon("bandara", "b1", 3), calon("asing", "a1", 9), calon("tni", "korem-152", 30), calon("tni", "lanal", 4)]);
    expect(hasil.map((c) => c.pilihan.props.id)).toEqual(["lanal", "korem-152", "a1", "b1", "p1", "landing-ternate"]);
  });

  it("objek yang sama dari dua layer (titik + label) cuma muncul sekali", () => {
    expect(urutkanCalon([calon("tni", "x", 5), calon("tni", "x", 2)])).toHaveLength(1);
  });

  it("jarak NaN dianggap paling jauh, tidak mengacak urutan", () => {
    expect(urutkanCalon([calon("tni", "x", Number.NaN), calon("tni", "x", 3)])[0].d2).toBe(3);
    const hasil = urutkanCalon([calon("tni", "a", Number.NaN), calon("tni", "b", 9), calon("tni", "c", 1)]);
    expect(hasil.map((c) => c.pilihan.props.id)).toEqual(["c", "b", "a"]);
  });

  it("objek dengan id kosong dibedakan lewat namanya", () => {
    const tanpaId = (nama: string, d2: number): CalonKlik => ({ pilihan: { lapisan: "kabel", props: { id: "", nama }, lon: 0, lat: 0 }, d2 });
    expect(urutkanCalon([tanpaId("SEA-ME-WE 5", 1), tanpaId("IGG", 2)]).map((c) => c.pilihan.props.nama)).toEqual(["SEA-ME-WE 5", "IGG"]);
  });
});

describe("shortcut lapisan (EOG-37)", () => {
  it("cocok lewat karakter dan lewat posisi tombol di keyboard non-US", () => {
    expect(lapisanDariTombol({ key: "[", code: "BracketLeft" })?.id).toBe("bandara");
    expect(lapisanDariTombol({ key: "ü", code: "BracketLeft" })?.id).toBe("bandara");
    expect(lapisanDariTombol({ key: "&", code: "Digit1" })?.id).toBe("tni");
    expect(lapisanDariTombol({ key: "x", code: "KeyX" })).toBeUndefined();
  });

  it("setiap lapisan bisa dijangkau lewat code", () => {
    const kode: Record<string, string> = { "[": "BracketLeft", "]": "BracketRight", ";": "Semicolon", "-": "Minus", "=": "Equal" };
    for (const l of LAPISAN) {
      const code = /^\d$/.test(l.tombol) ? `Digit${l.tombol}` : kode[l.tombol];
      expect(lapisanDariTombol({ key: "?", code })?.id, l.id).toBe(l.id);
    }
  });
});

describe("epoch TLE (EOG-36)", () => {
  it("YYDDD.ffff jadi tanggal UTC", () => {
    expect(tanggalEpochTle("26315.65")?.toISOString()).toBe("2026-11-11T15:36:00.000Z");
    expect(tanggalEpochTle("99001.5")?.getUTCFullYear()).toBe(1999);
    expect(tanggalEpochTle("bukan")).toBeNull();
  });

  it("tampil sebagai tanggal + umur", () => {
    const sekarang = Date.UTC(2026, 10, 12, 16, 0);
    expect(formatEpochTle("26315.65", "id", sekarang)).toBe("11 Nov 2026, 1 hari lalu");
    expect(formatEpochTle("26315.65", "en", sekarang)).toBe("11 Nov 2026, 1 day ago");
    expect(formatEpochTle("26316.5", "id", sekarang)).toBe("12 Nov 2026, 4 jam lalu");
    expect(formatEpochTle("aneh", "id", sekarang)).toBe("aneh");
  });
});

describe("pencarian: entri tanpa nama atau keterangan", () => {
  it("nama/sub null tidak membuat pencarian error", () => {
    const rusak = { ...entri("tni", "x"), nama: null, sub: undefined } as unknown as EntriCari;
    const indeks = [rusak, entri("tni", "Lanal Ranai (Natuna)", "Lanal"), { ...entri("kabel", "Natuna Cable"), sub: null } as unknown as EntriCari];
    expect(cariEntri("natuna", indeks).map((e) => e.nama)).toEqual(["Lanal Ranai (Natuna)", "Natuna Cable"]);
    expect(skorCari("natuna", rusak)).toBe(0);
  });
});
