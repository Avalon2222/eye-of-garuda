import { describe, expect, it } from "vitest";
import { tanggalEpochTle } from "@/lib/waktu";

describe("tanggalEpochTle", () => {
  it("hari ke-366 hanya sah di tahun kabisat", () => {
    expect(tanggalEpochTle("24366.5")?.toISOString()).toBe("2024-12-31T12:00:00.000Z");
    expect(tanggalEpochTle("26366.5")).toBeNull();
    expect(tanggalEpochTle("26365.99")?.getUTCFullYear()).toBe(2026);
  });
});
