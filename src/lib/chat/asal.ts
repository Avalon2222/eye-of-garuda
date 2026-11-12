/**
 * Pemeriksa asal permintaan untuk /api/chat. Browser selalu mengirim header Origin pada POST, jadi
 * permintaan tanpa Origin (curl, skrip) atau dari situs lain ditolak. Ini bukan pengaman mutlak karena
 * header bisa dipalsukan dari luar browser, tapi cukup untuk mencegah situs lain menumpang kuota.
 */

function host(nilai: string | null): string {
  if (!nilai) return "";
  try {
    return new URL(nilai.includes("://") ? nilai : `https://${nilai}`).host.toLowerCase();
  } catch {
    return "";
  }
}

/** `izinTambahan`: daftar asal dipisah koma (mis. domain kustom), biasanya dari env CHAT_ASAL_IZIN. */
export function asalDiizinkan(headers: Headers, izinTambahan = ""): boolean {
  const asal = host(headers.get("origin"));
  if (!asal) return false;
  const situs = headers.get("sec-fetch-site");
  if (situs && situs !== "same-origin") {
    // lintas situs hanya boleh kalau asalnya didaftarkan
    return izinTambahan.split(",").some((i) => host(i.trim()) === asal);
  }
  const sendiri = host(headers.get("x-forwarded-host")) || host(headers.get("host"));
  if (sendiri && asal === sendiri) return true;
  return izinTambahan.split(",").some((i) => host(i.trim()) === asal);
}
