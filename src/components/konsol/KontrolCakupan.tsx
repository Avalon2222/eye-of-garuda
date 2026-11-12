"use client";

import { terjemah, type Lang } from "@/lib/i18n";
import type { CakupanPesawat } from "@/lib/live/pesawat";

interface Props {
  lang: Lang;
  cakupan: CakupanPesawat;
  onUbah: (c: CakupanPesawat) => void;
}

/** Pilihan cakupan pesawat live: kawasan (sekitar Indonesia) atau seluruh dunia. Desktop saja. */
export default function KontrolCakupan({ lang, cakupan, onUbah }: Props) {
  return (
    <div className="glass pointer-events-auto absolute right-2 top-[82px] z-20 flex items-center gap-1 p-1 sm:right-3 sm:top-[92px] max-sm:hidden">
      <span className="label-kecil px-1">{terjemah(lang, "aircraft_scope")}</span>
      <button className={`tombol-hud ${cakupan === "kawasan" ? "aktif" : ""}`} onClick={() => onUbah("kawasan")}>
        {terjemah(lang, "scope_region")}
      </button>
      <button className={`tombol-hud ${cakupan === "dunia" ? "aktif" : ""}`} onClick={() => onUbah("dunia")}>
        {terjemah(lang, "scope_world")}
      </button>
    </div>
  );
}
