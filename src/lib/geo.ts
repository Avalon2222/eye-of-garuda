/** Fungsi geometri kecil (tanpa pustaka) untuk lingkaran radius, jarak, dan ekstrapolasi posisi. */

export const R_BUMI_KM = 6371.0088;
const RAD = Math.PI / 180;
const DEG = 180 / Math.PI;

export function jarakKm(lon1: number, lat1: number, lon2: number, lat2: number): number {
  const dLat = (lat2 - lat1) * RAD;
  const dLon = (lon2 - lon1) * RAD;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * RAD) * Math.cos(lat2 * RAD) * Math.sin(dLon / 2) ** 2;
  return 2 * R_BUMI_KM * Math.asin(Math.sqrt(a));
}

/** Titik tujuan dari (lon, lat) dengan arah `bearingDeg` sejauh `jarak` km. */
export function titikTujuan(lon: number, lat: number, bearingDeg: number, jarak: number): [number, number] {
  const d = jarak / R_BUMI_KM;
  const b = bearingDeg * RAD;
  const la1 = lat * RAD;
  const lo1 = lon * RAD;
  const la2 = Math.asin(Math.sin(la1) * Math.cos(d) + Math.cos(la1) * Math.sin(d) * Math.cos(b));
  const lo2 = lo1 + Math.atan2(Math.sin(b) * Math.sin(d) * Math.cos(la1), Math.cos(d) - Math.sin(la1) * Math.sin(la2));
  let lonOut = lo2 * DEG;
  if (lonOut > 180) lonOut -= 360;
  if (lonOut < -180) lonOut += 360;
  return [lonOut, la2 * DEG];
}

/** Poligon lingkaran geodesik (GeoJSON ring) berjari-jari `radiusKm`. */
export function lingkaran(lon: number, lat: number, radiusKm: number, n = 72): [number, number][] {
  const ring: [number, number][] = [];
  for (let i = 0; i <= n; i++) ring.push(titikTujuan(lon, lat, (360 * i) / n, radiusKm));
  return ring;
}

/** Titik-titik great-circle mentah (bujur -180..180) dari titik 1 ke titik 2; d = sudut pusat (radian). */
function titikGreatCircle(lon1: number, lat1: number, lon2: number, lat2: number, d: number, n: number): [number, number][] {
  const la1 = lat1 * RAD, lo1 = lon1 * RAD, la2 = lat2 * RAD, lo2 = lon2 * RAD;
  const out: [number, number][] = [];
  for (let i = 0; i <= n; i++) {
    const f = i / n;
    const A = Math.sin((1 - f) * d) / Math.sin(d);
    const B = Math.sin(f * d) / Math.sin(d);
    const x = A * Math.cos(la1) * Math.cos(lo1) + B * Math.cos(la2) * Math.cos(lo2);
    const y = A * Math.cos(la1) * Math.sin(lo1) + B * Math.cos(la2) * Math.sin(lo2);
    const z = A * Math.sin(la1) + B * Math.sin(la2);
    out.push([Math.atan2(y, x) * DEG, Math.atan2(z, Math.sqrt(x * x + y * y)) * DEG]);
  }
  return out;
}

/** Busur melengkung (great-circle dengan sedikit "angkat") antara dua titik, untuk animasi arc. */
export function busur(lon1: number, lat1: number, lon2: number, lat2: number, n = 48): [number, number][] {
  const la1 = lat1 * RAD, lo1 = lon1 * RAD, la2 = lat2 * RAD, lo2 = lon2 * RAD;
  const d = 2 * Math.asin(Math.sqrt(Math.sin((la2 - la1) / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin((lo2 - lo1) / 2) ** 2));
  if (d === 0) return [[lon1, lat1], [lon2, lat2]];
  let out: [number, number][];
  if (Math.sin(d) < 1e-6) {
    // Titik yang (hampir) berseberangan: sin(d) ~ 0 membuat rumus interpolasi membagi dengan nol, dan
    // titik-titiknya menumpuk di satu tempat. Busur dipecah lewat titik tengah sejauh d/2 dari asal.
    const arah = Math.atan2(
      Math.sin(lo2 - lo1) * Math.cos(la2),
      Math.cos(la1) * Math.sin(la2) - Math.sin(la1) * Math.cos(la2) * Math.cos(lo2 - lo1),
    ) * DEG;
    const [lonT, latT] = titikTujuan(lon1, lat1, arah, (d / 2) * R_BUMI_KM);
    const n1 = Math.floor(n / 2);
    out = [
      ...titikGreatCircle(lon1, lat1, lonT, latT, d / 2, n1),
      ...titikGreatCircle(lonT, latT, lon2, lat2, d / 2, n - n1).slice(1),
    ];
  } else {
    out = titikGreatCircle(lon1, lat1, lon2, lat2, d, n);
  }
  // Busur yang melintasi garis tanggal (mis. Washington -> Jakarta lewat Pasifik) meloncat dari 180 ke -180,
  // dan MapLibre lalu menggambarnya memutari separuh bumi. Bujur dibuat bersambung dari titik tujuan ke
  // belakang, sehingga tujuan tetap persis di koordinatnya dan asal boleh di luar -180..180.
  for (let i = out.length - 2; i >= 0; i--) {
    while (out[i][0] - out[i + 1][0] > 180) out[i][0] -= 360;
    while (out[i][0] - out[i + 1][0] < -180) out[i][0] += 360;
  }
  return out;
}

export function knotKeKmJam(knot: number): number {
  return knot * 1.852;
}

export function kakiKeMeter(kaki: number): number {
  return kaki * 0.3048;
}

/** Bujur ke rentang -180..180. Klik di salinan dunia (mode peta 2D) memberi bujur seperti 466,85. */
export function bungkusBujur(lon: number): number {
  if (lon >= -180 && lon <= 180) return lon; // jangan sentuh angka yang sudah benar (hindari galat pembulatan)
  const b = ((((lon + 180) % 360) + 360) % 360) - 180;
  return b === -180 && lon > 0 ? 180 : b;
}

export function formatKoordinat(lon: number, lat: number): string {
  if (!Number.isFinite(lon) || !Number.isFinite(lat)) return "-";
  lon = bungkusBujur(lon);
  // Arah dipilih dari angka yang sudah dibulatkan, supaya -0.0001 tampil "0.000°N", bukan "0.000°S".
  const la = Math.abs(lat).toFixed(3);
  const lo = Math.abs(lon).toFixed(3);
  const ns = lat >= 0 || Number(la) === 0 ? "N" : "S";
  const ew = lon >= 0 || Number(lo) === 0 ? "E" : "W";
  return `${la}°${ns} ${lo}°${ew}`;
}
