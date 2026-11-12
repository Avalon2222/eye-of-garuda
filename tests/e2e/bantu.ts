import { expect, type Page } from "@playwright/test";

/** Kumpulkan pelanggaran CSP selama halaman dipakai. */
export function pantauCsp(page: Page): string[] {
  const pelanggaran: string[] = [];
  page.on("console", (m) => {
    if (m.type() === "error" && /Content Security Policy|Refused to/i.test(m.text())) pelanggaran.push(m.text());
  });
  return pelanggaran;
}

/** Buka konsol, lewati layar boot, dan tandai panduan sudah dilihat supaya tidak menutupi tombol. */
export async function bukaKonsol(page: Page, jalur = "/") {
  await page.addInitScript(() => {
    try {
      window.localStorage.setItem("eog-panduan-v1", "1");
    } catch {
      /* penyimpanan diblokir: abaikan */
    }
  });
  await page.goto(jalur);
  // layar boot bisa selesai sendiri sebelum sempat diklik, jadi kliknya boleh gagal
  const lewati = page.getByRole("button", { name: /Lewati|Skip/ });
  await lewati.click({ timeout: 4000 }).catch(() => undefined);
  await expect(lewati).toHaveCount(0);
  await expect(page.getByRole("banner")).toBeVisible();
}

/** Tombol yang terlihat tapi keluar dari layar (terpotong) dihitung gagal. */
export async function tombolTerpotong(page: Page, pemilih: string): Promise<string[]> {
  return page.evaluate((sel) => {
    const lebar = document.documentElement.clientWidth;
    const tinggi = document.documentElement.clientHeight;
    const hasil: string[] = [];
    for (const el of Array.from(document.querySelectorAll<HTMLElement>(sel))) {
      const k = el.getBoundingClientRect();
      if (k.width === 0 || k.height === 0) continue;
      if (k.left < -0.5 || k.top < -0.5 || k.right > lebar + 0.5 || k.bottom > tinggi + 0.5) hasil.push(`${el.getAttribute("aria-label") ?? el.title ?? el.textContent} @ ${Math.round(k.left)}..${Math.round(k.right)}`);
    }
    return hasil;
  }, pemilih);
}

/** Tombol tanpa nama yang bisa dibaca pembaca layar. */
export async function tombolTanpaNama(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const hasil: string[] = [];
    for (const el of Array.from(document.querySelectorAll<HTMLElement>("button, [role=button], a[href]"))) {
      const nama = (el.getAttribute("aria-label") ?? "").trim() || (el.textContent ?? "").trim();
      if (!nama) hasil.push(el.outerHTML.slice(0, 160));
    }
    return hasil;
  });
}
