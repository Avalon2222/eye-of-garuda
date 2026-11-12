import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { BERKAS_CHAT, LAPISAN_CHAT, bangunIndeks, type KoleksiMentah, type LapisanChat, type ObjekPeta } from "@/lib/chat/indeks";

export const DIR_DATA = fileURLToPath(new URL("../../public/data", import.meta.url));

export function bacaData<T = unknown>(berkas: string): T {
  return JSON.parse(readFileSync(path.join(DIR_DATA, berkas), "utf8")) as T;
}

let indeks: ObjekPeta[] | null = null;

/** Indeks objek dari GeoJSON asli di public/data, sama seperti yang dipakai server. */
export function indeksAsli(): ObjekPeta[] {
  if (!indeks) {
    const sumber: Partial<Record<LapisanChat, KoleksiMentah>> = {};
    for (const l of LAPISAN_CHAT) sumber[l] = bacaData<KoleksiMentah>(BERKAS_CHAT[l]);
    indeks = bangunIndeks(sumber);
  }
  return indeks;
}
