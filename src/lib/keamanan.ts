/**
 * Header keamanan untuk semua halaman (dipasang lewat next.config.ts).
 * Kalau browser perlu mengambil sesuatu dari host baru (ubin peta, data, font), tambahkan host-nya
 * di SUMBER_LUAR; kalau tidak, permintaan itu diblokir Content-Security-Policy.
 */

export const SUMBER_LUAR = {
  /** fetch/XHR dari browser: gaya dan ubin peta, citra satelit, data live di cabang `data` */
  sambung: ["https://tiles.openfreemap.org", "https://server.arcgisonline.com", "https://raw.githubusercontent.com"],
  gambar: ["https://tiles.openfreemap.org", "https://server.arcgisonline.com"],
  gaya: ["https://fonts.googleapis.com"],
  font: ["https://fonts.gstatic.com"],
};

export function kebijakanKonten(dev = false): string {
  const aturan: [string, string[]][] = [
    ["default-src", ["'self'"]],
    // Next menyisipkan skrip inline untuk hidrasi; mode dev butuh eval untuk hot reload
    ["script-src", ["'self'", "'unsafe-inline'", ...(dev ? ["'unsafe-eval'"] : [])]],
    ["style-src", ["'self'", "'unsafe-inline'", ...SUMBER_LUAR.gaya]],
    ["img-src", ["'self'", "data:", "blob:", ...SUMBER_LUAR.gambar]],
    ["font-src", ["'self'", "data:", ...SUMBER_LUAR.font]],
    ["connect-src", ["'self'", "data:", "blob:", ...SUMBER_LUAR.sambung, ...(dev ? ["ws:"] : [])]],
    // worker MapLibre dan penghitung lintasan satelit
    ["worker-src", ["'self'", "blob:"]],
    ["child-src", ["'self'", "blob:"]],
    ["media-src", ["'self'", "blob:"]],
    ["object-src", ["'none'"]],
    ["base-uri", ["'self'"]],
    ["form-action", ["'self'"]],
    ["frame-ancestors", ["'self'"]],
  ];
  return aturan.map(([nama, nilai]) => `${nama} ${nilai.join(" ")}`).join("; ");
}

export function headerKeamanan(dev = false): { key: string; value: string }[] {
  return [
    { key: "Content-Security-Policy", value: kebijakanKonten(dev) },
    { key: "X-Frame-Options", value: "SAMEORIGIN" },
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), fullscreen=(self)" },
  ];
}
