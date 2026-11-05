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

/** Busur melengkung (great-circle dengan sedikit "angkat") antara dua titik, untuk animasi arc. */
export function busur(lon1: number, lat1: number, lon2: number, lat2: number, n = 48): [number, number][] {
  const la1 = lat1 * RAD, lo1 = lon1 * RAD, la2 = lat2 * RAD, lo2 = lon2 * RAD;
  const d = 2 * Math.asin(Math.sqrt(Math.sin((la2 - la1) / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin((lo2 - lo1) / 2) ** 2));
  const out: [number, number][] = [];
  if (d === 0) return [[lon1, lat1], [lon2, lat2]];
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

export function knotKeKmJam(knot: number): number {
  return knot * 1.852;
}

export function kakiKeMeter(kaki: number): number {
  return kaki * 0.3048;
}

export function formatKoordinat(lon: number, lat: number): string {
  const ns = lat >= 0 ? "N" : "S";
  const ew = lon >= 0 ? "E" : "W";
  return `${Math.abs(lat).toFixed(3)}°${ns} ${Math.abs(lon).toFixed(3)}°${ew}`;
}
