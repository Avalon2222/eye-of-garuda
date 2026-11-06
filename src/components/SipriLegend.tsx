"use client";

import type { DataSipri } from "@/lib/analisis";
import { terjemah, type Lang } from "@/lib/i18n";

export default function SipriLegend({ lang, data, onPilih }: { lang: Lang; data: DataSipri; onPilih: (negara: string) => void }) {
  const urut = [...data.pemasok].sort((a, b) => b.tiv_juta - a.tiv_juta);
  const maks = urut[0]?.tiv_juta ?? 1;
  return (
    <div className="glass braket pointer-events-auto absolute bottom-[44px] right-[58px] z-20 hidden w-[300px] sm:block">
      <div className="border-b border-white/10 px-3 py-2">
        <div className="label-kecil text-[9px]" style={{ color: "#c084fc" }}>
          SIPRI · {data.periode}
        </div>
        <div className="text-[12px] text-text">{lang === "id" ? "Pemasok senjata Indonesia" : "Indonesia's arms suppliers"}</div>
      </div>
      <div className="gulir max-h-[38vh] overflow-y-auto px-3 py-2">
        {urut.map((p) => (
          <button key={p.negara} onClick={() => onPilih(p.negara)} className="grid w-full grid-cols-[96px_1fr_44px] items-center gap-2 py-[3px] text-left text-[11px] hover:bg-white/[0.04]">
            <span className="truncate text-muted">{p.negara}</span>
            <span className="h-2 bg-white/5">
              <span className="block h-full" style={{ width: `${(p.tiv_juta / maks) * 100}%`, background: "#c084fc", opacity: 0.8 }} />
            </span>
            <span className="text-right tabular-nums text-text">{p.persen}%</span>
          </button>
        ))}
        <p className="mt-2 text-[9.5px] leading-snug text-dim">{terjemah(lang, "arms_caveat")} {lang === "id" ? "Angka perkiraan (keyakinan rendah), periksa ulang di basis data SIPRI." : "Estimated figures (low confidence), verify in the SIPRI database."}</p>
      </div>
    </div>
  );
}
