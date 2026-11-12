import { expect, test } from "@playwright/test";
import { bukaKonsol } from "./bantu";

test("pencarian 'natuna' menaruh wilayah dan markas di atas landing station", async ({ page }) => {
  await bukaKonsol(page);
  const dialog = page.getByRole("dialog", { name: "Search" });
  const hasil = dialog.getByRole("listitem");
  // indeks pencarian baru lengkap setelah data lapisan selesai dimuat: buka ulang sampai ada hasil
  await expect(async () => {
    if (await dialog.count()) await page.keyboard.press("Escape");
    await page.keyboard.press("Control+k");
    await expect(dialog).toBeVisible();
    await page.keyboard.type("natuna");
    await expect(hasil.first()).toContainText("Laut Natuna Utara", { timeout: 1000 });
  }).toPass({ timeout: 30_000 });
  const teks = await hasil.allInnerTexts();
  const iLanal = teks.findIndex((t) => t.includes("Lanal Ranai"));
  const iLanding = teks.findIndex((t) => t.includes("Natuna, Indonesia"));
  expect(iLanal).toBeGreaterThan(-1);
  expect(iLanding === -1 || iLanal < iLanding).toBe(true);
});

test("bantuan menampilkan semua shortcut lapisan", async ({ page }) => {
  await bukaKonsol(page);
  await page.keyboard.press("?");
  const daftar = page.getByTestId("bantuan-lapisan");
  await expect(daftar).toBeVisible();
  await expect(daftar.locator(".kbd")).toHaveCount(15);
  for (const k of ["[", "]", ";", "-", "="]) await expect(daftar.locator(".kbd", { hasText: k }).first()).toBeVisible();
});
