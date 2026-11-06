"use client";

import { useEffect, useState } from "react";
import Logo from "./Logo";
import { terjemah, type Lang } from "@/lib/i18n";

const LANGKAH = ["boot_1", "boot_2", "boot_3", "boot_4"] as const;

export default function BootScreen({ onSelesai }: { lang?: Lang; onSelesai: () => void }) {
  // layar boot selalu berbahasa Inggris (gaya konsol), apa pun bahasa UI
  const lang: Lang = "en";
  const [langkah, setLangkah] = useState(0);
  const [progres, setProgres] = useState(0);
  const [pudar, setPudar] = useState(false);

  useEffect(() => {
    const mulai = performance.now();
    const total = 2800;
    let raf = 0;
    const tik = () => {
      const t = Math.min(1, (performance.now() - mulai) / total);
      setProgres(t);
      setLangkah(Math.min(LANGKAH.length - 1, Math.floor(t * LANGKAH.length)));
      if (t < 1) raf = requestAnimationFrame(tik);
      else {
        setPudar(true);
        setTimeout(onSelesai, 500);
      }
    };
    raf = requestAnimationFrame(tik);
    return () => cancelAnimationFrame(raf);
  }, [onSelesai]);

  return (
    <div
      className={`absolute inset-0 z-50 flex flex-col items-center justify-center bg-bg transition-opacity duration-500 ${pudar ? "opacity-0 pointer-events-none" : "opacity-100"}`}
    >
      <div className="pindai" />
      <div className="relative flex flex-col items-center gap-6 px-6">
        <Logo size={72} className="text-accent drop-shadow-[0_0_24px_rgba(255,90,60,0.45)]" />
        <div className="text-center">
          <div className="text-xl tracking-[0.5em] text-gold">EYE OF GARUDA</div>
          <div className="mt-1 text-[11px] tracking-[0.25em] text-muted uppercase">{terjemah(lang, "tagline")}</div>
        </div>
        <div className="w-[320px] max-w-[80vw]">
          <div className="h-[2px] w-full bg-white/10">
            <div className="h-full bg-accent transition-[width] duration-100" style={{ width: `${progres * 100}%` }} />
          </div>
          <ul className="mt-4 space-y-1 text-[11px] tracking-[0.15em]">
            {LANGKAH.map((k, i) => (
              <li key={k} className={i <= langkah ? "text-text" : "text-dim"}>
                <span className="text-accent">{i < langkah ? "[OK]" : i === langkah ? "[..]" : "[  ]"}</span>{" "}
                <span className={i === langkah ? "kursor" : ""}>{terjemah(lang, k)}</span>
              </li>
            ))}
          </ul>
        </div>
        <button onClick={onSelesai} className="tombol-hud mt-2">
          {terjemah(lang, "boot_skip")} <span className="kbd">Esc</span>
        </button>
      </div>
    </div>
  );
}
