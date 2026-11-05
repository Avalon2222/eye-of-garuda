"use client";

import { terjemah, type Lang } from "@/lib/i18n";

export default function Ticker({ lang, item }: { lang: Lang; item: string[] }) {
  const teks = item.length ? item : [terjemah(lang, "loading")];
  return (
    <footer className="pointer-events-none absolute inset-x-0 bottom-0 z-20">
      <div className="glass pointer-events-auto flex h-[34px] items-center overflow-hidden border-x-0 border-b-0">
        <div className="flex h-full shrink-0 items-center gap-2 border-r border-white/10 bg-accent/10 px-3 text-[10px] tracking-[0.25em] text-accent">
          <span className="denyut !bg-accent" /> {terjemah(lang, "live")}
        </div>
        <div className="relative flex-1 overflow-hidden">
          <div className="ticker-jalur text-[11px] text-muted">
            {teks.map((t, i) => (
              <span key={i} className="mx-6">
                <span className="text-accent">▸</span> {t}
              </span>
            ))}
          </div>
        </div>
        <div className="hidden h-full shrink-0 items-center border-l border-white/10 px-3 text-[9px] tracking-[0.1em] text-dim lg:flex">
          {terjemah(lang, "disclaimer")}
        </div>
      </div>
    </footer>
  );
}
