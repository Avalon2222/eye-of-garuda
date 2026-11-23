import { describe, expect, it } from "vitest";
import { kodeNegara, namaSatelit, type MetaSatelit } from "@/lib/live/satelit";

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
