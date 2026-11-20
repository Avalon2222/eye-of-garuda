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
