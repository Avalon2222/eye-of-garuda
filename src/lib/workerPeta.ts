/**
 * Worker MapLibre cukup diunduh sekali per kunjungan.
 *
 * MapLibre bikin 1–3 worker (tergantung jumlah core) dan tiap `new Worker(url)` mengambil
 * skrip yang sama. Kalau request-nya barengan, cache browser belum sempat terisi, jadi file
 * ~520 KB itu ikut terunduh 2–3 kali di HP. Di sini skrip diambil sekali, dijadikan blob URL,
 * lalu semua worker memakai blob itu (CSP sudah mengizinkan `worker-src blob:`).
 */

export const URL_WORKER_PETA = "/maplibre/maplibre-gl-worker.mjs";

let janji: Promise<string> | null = null;

export function workerPetaSekali(url = URL_WORKER_PETA): Promise<string> {
  janji ??= fetch(url)
    .then((res) => {
      if (!res.ok) throw new Error(`worker ${res.status}`);
      return res.blob();
    })
    .then((isi) => URL.createObjectURL(new Blob([isi], { type: "text/javascript" })))
    // gagal? pakai URL biasa saja, MapLibre tetap jalan (cuma unduhnya bisa dobel)
    .catch(() => {
      janji = null;
      return url;
    });
  return janji;
}
