import { existsSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { KUNCI_KAMUS, terjemah } from "@/lib/i18n";
import { LAPISAN, LAPISAN_BAWAAN, lapisanDariId } from "@/lib/layers";
import { FAQ, PINTASAN_TEKS, jawabFaq } from "@/lib/pengetahuan";
import { TOUR } from "@/lib/tour";
import { DIR_DATA } from "./bantu";

function tempatIsian(teks: string): string[] {
  return [...teks.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();
}

describe("kamus antarmuka", () => {
  it("setiap kunci punya teks Indonesia dan Inggris yang tidak kosong", () => {
    expect(KUNCI_KAMUS.length).toBeGreaterThan(100);
    for (const k of KUNCI_KAMUS) {
      expect(terjemah("id", k).trim(), `id: ${k}`).not.toBe("");
      expect(terjemah("en", k).trim(), `en: ${k}`).not.toBe("");
    }
  });

  it("tempat isian {…} sama di kedua bahasa", () => {
    for (const k of KUNCI_KAMUS) expect(tempatIsian(terjemah("en", k)), k).toEqual(tempatIsian(terjemah("id", k)));
  });

  it("terjemah mengisi tempat isian dan aman untuk kunci asing", () => {
    expect(terjemah("id", "scenario_autoclose", { n: 7 })).toBe("Menutup otomatis dalam 7 dtk");
    expect(terjemah("en", "scenario_autoclose", { n: 7 })).toBe("Closes automatically in 7 s");
    expect(terjemah("id", "tidak_ada" as never)).toBe("tidak_ada");
  });
});

describe("registri lapisan", () => {
  it("id dan tombol pintasan unik", () => {
    expect(new Set(LAPISAN.map((l) => l.id)).size).toBe(LAPISAN.length);
    expect(new Set(LAPISAN.map((l) => l.tombol)).size).toBe(LAPISAN.length);
  });

  it("nama dan deskripsi tersedia dalam dua bahasa", () => {
    for (const l of LAPISAN) {
      for (const teks of [l.nama, l.deskripsi]) {
        expect(teks.id.trim(), l.id).not.toBe("");
        expect(teks.en.trim(), l.id).not.toBe("");
      }
      expect(l.warna).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });

  it("berkas data tiap lapisan statis ada di public/data", () => {
    for (const l of LAPISAN) if (l.berkas) expect(existsSync(path.join(DIR_DATA, l.berkas)), l.berkas).toBe(true);
  });

  it("lapisan bawaan dan pencarian per id konsisten", () => {
    for (const id of LAPISAN_BAWAAN) expect(lapisanDariId(id)?.aktifAwal).toBe(true);
    expect(lapisanDariId("bukan-lapisan")).toBeUndefined();
  });
});

describe("FAQ, pintasan, dan tur", () => {
  it("setiap FAQ punya jawaban dua bahasa dan lapisan yang sah", () => {
    for (const f of FAQ) {
      expect(f.kunci.length).toBeGreaterThan(0);
      expect(f.jawab.id.trim() && f.jawab.en.trim()).toBeTruthy();
      if (f.lapisan) expect(lapisanDariId(f.lapisan), f.lapisan).toBeDefined();
    }
  });

  it("FAQ menjawab pertanyaan umum dan diam untuk yang tidak dikenal", () => {
    expect(jawabFaq("satelit itu apa?", "id")?.lapisan).toBe("satelit");
    expect(jawabFaq("tell me about submarines", "en")?.lapisan).toBe("kapalselam");
    expect(jawabFaq("zzz qqq", "id")).toBeNull();
  });

  it("pintasan dan langkah tur terisi", () => {
    for (const [tombol, ket] of PINTASAN_TEKS) expect(tombol && ket).toBeTruthy();
    expect(TOUR.length).toBeGreaterThan(2);
  });
});
