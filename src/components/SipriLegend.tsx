"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, ArrowRightLeft } from "lucide-react";
import type { DataSipri } from "@/lib/analisis";
import { terjemah, type Lang } from "@/lib/i18n";

/** Legenda SIPRI: bisa dilipat jadi tab kecil di kanan bawah dan dibuka lagi selama lapisan SIPRI menyala. */
export default function SipriLegend({ lang, data, onPilih }: { lang: Lang; data: DataSipri; onPilih: (negara: string) => void }) {
  const [terbuka, setTerbuka] = useState(true);
  const urut = [...data.pemasok].sort((a, b) => b.tiv_juta - a.tiv_juta);
  const maks = urut[0]?.tiv_juta ?? 1;
  if (!terbuka) {
    return (
      <button
        className="glass pointer-events-auto absolute right-3 top-[140px] z-20 hidden items-center gap-2 px-3 py-1.5 text-[10px] tracking-[0.15em] uppercase text-muted hover:text-text sm:flex"
        onClick={() => setTerbuka(true)}
        title={terjemah(lang, "sipri_expand")}
        aria-label={`${terjemah(lang, "sipri_expand")}: SIPRI ${data.periode}`}
        aria-expanded={false}
        style={{ borderColor: "rgba(192,132,252,0.5)" }}
      >
        <ArrowRightLeft size={12} style={{ color: "#c084fc" }} /> SIPRI {data.periode} <ChevronUp size={12} />
      </button>
    );
  }
  return (
    <div role="region" aria-label={`SIPRI: ${terjemah(lang, "sipri_title")}`} className="glass braket pointer-events-auto absolute right-3 top-[140px] z-20 hidden w-[300px] sm:block">
      <div className="flex items-start justify-between gap-2 border-b border-white/10 px-3 py-2">
        <div className="min-w-0">
          <div className="label-kecil text-[9px]" style={{ color: "#c084fc" }}>
            SIPRI · {data.periode}
            {data.diambil ? <span className="text-dim"> · {terjemah(lang, "sipri_fetched")} {data.diambil}</span> : null}
          </div>
          <div className="text-[12px] text-text">{terjemah(lang, "sipri_title")}</div>
          <div className="text-[10px] tabular-nums text-muted">
            {lang === "id" ? "Total" : "Total"} {data.total_tiv_juta.toLocaleString("en-US")} {lang === "id" ? "juta TIV" : "m TIV"}
          </div>
        </div>
        <button className="tombol-ikon !h-7 !w-7 !border-0" onClick={() => setTerbuka(false)} title={terjemah(lang, "sipri_collapse")} aria-label={terjemah(lang, "sipri_collapse")} aria-expanded={true}>
          <ChevronDown size={14} />
        </button>
      </div>
      <div className="gulir max-h-[34vh] overflow-y-auto px-3 py-2">
        {urut.map((p) => (
          <button key={p.negara} onClick={() => onPilih(p.negara)} className="grid w-full grid-cols-[96px_1fr_44px] items-center gap-2 py-[3px] text-left text-[11px] hover:bg-white/[0.04]" title={p.tahun_puncak ? `${terjemah(lang, "sipri_peak")} ${p.tahun_puncak}` : undefined}>
            <span className="truncate text-muted">{lang === "en" && p.negara_en ? p.negara_en : p.negara}</span>
            <span className="h-2 bg-white/5">
              <span className="block h-full" style={{ width: `${(p.tiv_juta / maks) * 100}%`, background: "#c084fc", opacity: 0.8 }} />
            </span>
            <span className="text-right tabular-nums text-text">{p.persen}%</span>
          </button>
        ))}
        <p className="mt-2 text-[9.5px] leading-snug text-dim">{terjemah(lang, "arms_caveat")}</p>
      </div>
    </div>
  );
}
