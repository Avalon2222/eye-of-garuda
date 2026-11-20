import { describe, expect, it } from "vitest";
import { kategoriPesawat } from "@/lib/negara";

describe("kategoriPesawat", () => {
  it("helikopter dan pesawat sipil tidak salah masuk pembom", () => {
    expect(kategoriPesawat("H60")).toBe("helikopter");
    expect(kategoriPesawat("H64")).toBe("helikopter");
    expect(kategoriPesawat("B212")).toBe("helikopter");
    expect(kategoriPesawat("B190")).not.toBe("pembom");
  });

  it("kode pembom asli tetap dikenali", () => {
    for (const t of ["B52", "B1", "B2", "B21", "H6", "H6K", "H20", "TU95", "TU22"]) expect(kategoriPesawat(t)).toBe("pembom");
  });
});

describe("kategoriPesawat: kode tempur pendek", () => {
  it("F50 (Fokker 50) dan F406 (Caravan II) bukan pesawat tempur", () => {
    expect(kategoriPesawat("F50")).not.toBe("tempur");
    expect(kategoriPesawat("F406")).not.toBe("tempur");
  });

  it("F5, F5E, dan F4 tetap tempur", () => {
    for (const t of ["F5", "F5E", "F4", "F16", "SU30"]) expect(kategoriPesawat(t)).toBe("tempur");
  });
});

describe("kategoriPesawat: kode intai pendek", () => {
  it("pesawat sipil berawalan E7, E2, P1, P3, dan U2 bukan pesawat intai", () => {
    for (const t of ["E75L", "E290", "P180", "P32R", "U206"]) expect(kategoriPesawat(t)).not.toBe("intai");
  });

  it("kode intai asli tetap dikenali", () => {
    for (const t of ["P8", "P8A", "P3", "P3C", "E7", "E2", "E2C", "E2D", "U2", "P1", "RQ4", "E3CF"]) {
      expect(kategoriPesawat(t)).toBe("intai");
    }
  });
});
