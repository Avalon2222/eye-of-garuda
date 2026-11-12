import { expect, test } from "@playwright/test";
import { bukaKonsol, pantauCsp, tombolTanpaNama, tombolTerpotong } from "./bantu";

/** Aksi header yang harus selalu bisa dijangkau, langsung atau lewat menu di layar sempit. */
const AKSI_HEADER = ["Search", "Bantuan", "Data & anggaran", "Fullscreen"];

test("konsol terbuka dan tombol header kelihatan", async ({ page }) => {
  const csp = pantauCsp(page);
  await bukaKonsol(page);

  const header = page.getByRole("banner");
  await expect(header.getByText("EYE OF GARUDA")).toBeVisible();
  expect(await header.getByRole("button").count()).toBeGreaterThanOrEqual(3);
  // tidak ada tombol header yang terpotong tepi layar
  expect(await tombolTerpotong(page, "header button")).toEqual([]);

  const menu = page.getByTestId("menu-header");
  if ((page.viewportSize()?.width ?? 0) <= 640) {
    // layar sempit: Search tetap di header, aksi lain pindah ke menu titik tiga
    await expect(header.getByRole("button", { name: "Search" })).toBeVisible();
    await expect(menu).toBeVisible();
    await menu.click();
    const daftar = page.getByRole("menu");
    for (const nama of AKSI_HEADER.slice(1)) await expect(daftar.getByRole("menuitem", { name: nama })).toBeVisible();
    expect(await tombolTerpotong(page, "header button")).toEqual([]);
    expect(await tombolTanpaNama(page)).toEqual([]);
    await page.keyboard.press("Escape");
    await expect(daftar).toHaveCount(0);
  } else {
    await expect(menu).toBeHidden();
    for (const nama of AKSI_HEADER) await expect(header.getByRole("button", { name: nama, exact: true })).toBeVisible();
  }

  // halaman tidak melebar ke samping
  const melebar = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(melebar).toBeLessThanOrEqual(0);
  expect(await tombolTanpaNama(page)).toEqual([]);
  expect(csp).toEqual([]);
});

test("peta dan data lapisan termuat tanpa melanggar CSP", async ({ page }) => {
  const csp = pantauCsp(page);
  const gagal: string[] = [];
  page.on("response", (r) => {
    const u = new URL(r.url());
    if (u.pathname.startsWith("/data/") && r.status() >= 400) gagal.push(`${r.status()} ${u.pathname}`);
  });
  await bukaKonsol(page);
  await expect(page.locator("canvas.maplibregl-canvas")).toBeVisible();
  await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => undefined);
  expect(gagal).toEqual([]);
  expect(csp).toEqual([]);
});

test("panel bantuan jadi dialog, fokus pindah ke panel, Esc menutup", async ({ page }) => {
  await bukaKonsol(page);
  await page.keyboard.press("?");
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await expect(dialog).toHaveAttribute("aria-modal", "true");
  expect(await dialog.evaluate((el) => el.contains(document.activeElement))).toBe(true);
  await expect(dialog.getByRole("button", { name: "Tutup" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
});

test("asisten merender Markdown dan menampilkan model yang dipakai", async ({ page }) => {
  await page.route("**/api/chat", async (rute) => {
    const badan = rute.request().postDataJSON() as { messages: { content: string }[] };
    expect(badan.messages.at(-1)?.content).toContain("Natuna");
    await rute.fulfill({
      json: {
        jawaban: "Yang terdekat **Changi Naval Base** (Singapura), sekitar 566 km.\n\n- Operator: Singapura\n- Arah: barat daya\n@terbang: Changi Naval Base",
        model: "openai/gpt-oss-120b",
        alat: ["terdekat"],
      },
    });
  });
  await bukaKonsol(page);
  await page.getByRole("button", { name: "Tanya Garuda AI" }).click();
  const panel = page.getByRole("dialog", { name: "Garuda AI" });
  await expect(panel).toBeVisible();
  await panel.getByRole("textbox").fill("Pangkalan asing terdekat dari Natuna apa?");
  await panel.getByRole("button", { name: "Kirim" }).click();

  const log = panel.getByRole("log");
  await expect(log.locator("strong")).toHaveText("Changi Naval Base");
  await expect(log.locator("li")).toHaveCount(2);
  await expect(log).not.toContainText("**");
  await expect(log).not.toContainText("@terbang");
  await expect(panel.getByTestId("chat-mode")).toHaveText("AI mode · gpt-oss-120b");
});

test("panel detail dari tautan bersama jadi dialog dan menerima fokus", async ({ page }) => {
  await bukaKonsol(page, "/#l=tni&sel=tni-64");
  const panel = page.getByRole("dialog", { name: /Markas TNI/ });
  // panel baru muncul setelah gaya peta dan data lapisan selesai dimuat
  await expect(panel).toBeVisible({ timeout: 30_000 });
  expect(await panel.evaluate((el) => el === document.activeElement || el.contains(document.activeElement))).toBe(true);
  await panel.getByRole("button", { name: "Tutup" }).click();
  await expect(panel).toHaveCount(0);
});
