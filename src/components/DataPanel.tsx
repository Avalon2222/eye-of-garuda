"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { terjemah, type Lang } from "@/lib/i18n";

interface Tabel {
  anggaran_indonesia: { tahun: number; rp_triliun: number; persen_pdb: number; keyakinan: string; catatan: string; sumber: string }[];
  anggaran_kawasan: { negara: string; usd_miliar: number; persen_pdb: number; personel_ribu: number; keyakinan: string; sumber: string }[];
  alutsista: { matra: string; nama: string; jumlah: number; status: string; sumber: string }[];
}

function BarVertikal({ data, lang }: { data: Tabel["anggaran_indonesia"]; lang: Lang }) {
  const maks = Math.max(...data.map((d) => d.rp_triliun));
  const W = 560, H = 170, pad = 28;
  const lebar = (W - pad * 2) / data.length;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
      {data.map((d, i) => {
        const h = ((H - 40) * d.rp_triliun) / maks;
        const x = pad + i * lebar + 4;
        return (
          <g key={d.tahun}>
            <rect x={x} y={H - 24 - h} width={lebar - 8} height={h} fill={d.keyakinan === "rendah" ? "rgba(251,191,36,0.55)" : "rgba(255,90,60,0.75)"} />
            <text x={x + (lebar - 8) / 2} y={H - 28 - h} textAnchor="middle" fontSize="9" fill="#e5e7eb">
              {d.rp_triliun.toFixed(0)}
            </text>
            <text x={x + (lebar - 8) / 2} y={H - 10} textAnchor="middle" fontSize="9" fill="#8b95a7">
              {d.tahun}
            </text>
          </g>
        );
      })}
      <text x={pad} y={12} fontSize="9" fill="#8b95a7">
        {lang === "id" ? "Pagu Kemhan, Rp triliun" : "MoD budget ceiling, Rp trillion"} · {lang === "id" ? "kuning = belum terealisasi" : "yellow = not yet realised"}
      </text>
    </svg>
  );
}

function BarHorizontal({ data, lang }: { data: Tabel["anggaran_kawasan"]; lang: Lang }) {
  const urut = [...data].sort((a, b) => b.usd_miliar - a.usd_miliar);
  const maks = urut[0]?.usd_miliar ?? 1;
  return (
    <div className="space-y-1">
      {urut.map((d) => (
        <div key={d.negara} className="grid grid-cols-[76px_1fr_auto] items-center gap-2 text-[11px] sm:grid-cols-[92px_1fr_auto]">
          <span className={d.negara === "Indonesia" ? "text-accent" : "text-muted"}>{d.negara}</span>
          <div className="h-3 bg-white/5">
            <div className="h-full" style={{ width: `${(d.usd_miliar / maks) * 100}%`, background: d.negara === "Indonesia" ? "#ff5a3c" : "#3b82f6", opacity: d.keyakinan === "rendah" ? 0.5 : 0.85 }} />
          </div>
          <span className="whitespace-nowrap text-right tabular-nums text-text">
            ${d.usd_miliar}
            <span className="text-dim">B</span> <span className="inline-block w-[34px] text-dim">{d.persen_pdb}%</span>
          </span>
        </div>
      ))}
      <div className="pt-1 text-[9.5px] text-dim">{lang === "id" ? "Belanja militer 2024, USD miliar · % PDB. SIPRI Milex 2024, dibulatkan." : "Military spending 2024, USD billion · % GDP. SIPRI Milex 2024, rounded."}</div>
    </div>
  );
}

export default function DataPanel({ lang, onTutup }: { lang: Lang; onTutup: () => void }) {
  const [t, setT] = useState<Tabel | null>(null);
  useEffect(() => {
    fetch("/data/tabel.json")
      .then((r) => r.json())
      .then(setT)
      .catch(() => setT(null));
  }, []);
  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/50 sm:p-3 sm:backdrop-blur-[2px]" onClick={onTutup}>
      <div className="glass braket muncul lembar-hp flex max-h-[88vh] w-[720px] max-w-full flex-col" role="dialog" aria-modal="true" aria-label={terjemah(lang, "data_panel")} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
          <div className="text-[12px] tracking-[0.25em] text-text uppercase">{terjemah(lang, "data_panel")}</div>
          <button className="tombol-ikon !h-7 !w-7 !border-0" onClick={onTutup} title={terjemah(lang, "close")} aria-label={terjemah(lang, "close")}>
            <X size={15} />
          </button>
        </div>
        <div className="gulir flex-1 overflow-y-auto px-4 py-3">
          {!t && <div className="text-dim">{terjemah(lang, "loading")}…</div>}
          {t && (
            <>
              <div className="label-kecil mb-1">{lang === "id" ? "Anggaran pertahanan Indonesia 2015–2026" : "Indonesia defense budget 2015–2026"}</div>
              <BarVertikal data={t.anggaran_indonesia} lang={lang} />
              <div className="label-kecil mb-2 mt-4">{lang === "id" ? "Perbandingan kawasan" : "Regional comparison"}</div>
              <BarHorizontal data={t.anggaran_kawasan} lang={lang} />
              <div className="label-kecil mb-2 mt-4">{lang === "id" ? "Alutsista utama (perkiraan)" : "Major equipment (estimates)"}</div>
              <table className="w-full text-[11px]">
                <thead className="text-dim">
                  <tr>
                    <th className="hidden py-1 pr-3 text-left font-normal sm:table-cell">{lang === "id" ? "Matra" : "Branch"}</th>
                    <th className="py-1 pr-3 text-left font-normal">Alutsista</th>
                    <th className="py-1 pr-3 text-right font-normal">{lang === "id" ? "Jumlah" : "Qty"}</th>
                    <th className="hidden py-1 text-left font-normal sm:table-cell">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {t.alutsista.map((a) => (
                    <tr key={a.nama} className="border-t border-white/5">
                      <td className="hidden py-1 pr-3 align-top text-muted sm:table-cell">{a.matra}</td>
                      <td className="py-1 pr-3 align-top text-text">
                        {a.nama}
                        <span className="block text-[10px] text-muted sm:hidden">
                          {a.matra} · {a.status}
                        </span>
                      </td>
                      <td className="py-1 pr-3 text-right align-top tabular-nums text-text">{a.jumlah ?? "–"}</td>
                      <td className="hidden py-1 align-top text-muted sm:table-cell">{a.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="mt-3 text-[9.5px] text-dim">{lang === "id" ? "Sumber: Kemenkeu/Nota Keuangan, SIPRI, IISS, Wikipedia. Lihat data/SUMBER_DATA.md." : "Sources: MoF budget notes, SIPRI, IISS, Wikipedia. See data/SUMBER_DATA.md."}</p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
