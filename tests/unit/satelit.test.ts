import { describe, expect, it } from "vitest";
import { twoline2satrec } from "satellite.js";
import { PelacakSatelit, kodeNegara, namaSatelit, type MetaSatelit, type SatAktif } from "@/lib/live/satelit";

const meta = (ubah: Partial<MetaSatelit>): MetaSatelit => ({
  norad: 25544, nama: "ISS (ZARYA)", negara: "Rusia", kelompok: "", misi: "", operator: "", diluncurkan: "", l1: "", l2: "", ...ubah,
});

describe("kodeNegara dan namaSatelit", () => {
  it("negara atau nama kosong dari katalog tidak membuat error", () => {
    expect(kodeNegara(null)).toBe("???");
    expect(kodeNegara(undefined)).toBe("???");
    expect(namaSatelit(meta({ negara: null as unknown as string }))).toBe("ISS (???)");
    expect(namaSatelit(meta({ nama: null as unknown as string }))).toMatch(/^NORAD 25544 \(/);
  });

  it("nama properti bawaan objek tidak dianggap kode negara", () => {
    expect(kodeNegara("constructor")).toBe("CON");
    expect(kodeNegara("toString")).toBe("TOS");
  });
});

describe("info satelit tanpa posisi terkini", () => {
  it("kelas orbit dihitung dari elemen orbit, bukan dari ketinggian 0", () => {
    const l1 = "1 65588U 25205A   26306.68854572 -.00000365  00000+0  00000+0 0  9991";
    const l2 = "2 65588   0.0187 120.4448 0000622 162.9960 119.2717  1.00270683  4106";
    const meta = { norad: 65588, nama: "NUSANTARA LIMA", negara: "Indonesia", kelompok: "Indonesia", misi: "", operator: "", diluncurkan: "", l1, l2 } as unknown as MetaSatelit;
    const a: SatAktif = { meta, rec: twoline2satrec(l1, l2), t0: 0, p: [0, 0, 0], v: [0, 0, 0], pos: null, gagal: false };
    expect(new PelacakSatelit().info(a).kelas_orbit).toBe("GEO");
  });
});

describe("namaSatelit dengan nama hanya keterangan", () => {
  it("nama yang hanya berisi kurung jatuh ke nomor NORAD", () => {
    expect(namaSatelit(meta({ nama: "(TBA)", negara: "Rusia" }))).toMatch(/^NORAD 25544 \(/);
    expect(namaSatelit(meta({ nama: "  (USA 326)  " }))).toMatch(/^NORAD 25544 \(/);
    expect(namaSatelit(meta({ nama: "COSMOS 2558 (USA)" }))).toMatch(/^COSMOS 2558 \(/);
  });
});

describe("kodeNegara dengan spasi sisa", () => {
  it("nama negara dari katalog dengan spasi tetap memakai kode resmi", () => {
    expect(kodeNegara("Korea Selatan ")).toBe("KOR");
    expect(kodeNegara("  Uni  Emirat Arab")).toBe("UAE");
    expect(kodeNegara("Arab Saudi")).toBe("SAU");
  });
});
