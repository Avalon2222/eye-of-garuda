import { useCallback, useRef, useState, type RefObject } from "react";
import type { Map as MapLibre } from "maplibre-gl";
import { terjemah, type Lang } from "@/lib/i18n";
import { skenarioKeMarkdown, type Skenario } from "@/lib/skenario";
import { fotoPng, unduhTeks, unduhBlob, Perekam } from "@/lib/ekspor";
import type { KanvasLive } from "@/lib/kanvasLive";

interface Opsi {
  mapRef: RefObject<MapLibre | null>;
  kanvasRef: RefObject<KanvasLive | null>;
  lang: Lang;
  tampilkanToast: (t: string) => void;
}

/** Ekspor dari War Room: ringkasan Markdown, foto PNG peta + kanvas, dan rekaman video WebM. */
export function useEkspor({ mapRef, kanvasRef, lang, tampilkanToast }: Opsi) {
  const perekamRef = useRef<Perekam | null>(null);
  const [merekam, setMerekam] = useState(false);

  const eksporMd = useCallback(
    (sk: Skenario | null) => {
      if (!sk) return;
      unduhTeks(skenarioKeMarkdown(sk, lang), `eye-of-garuda-${sk.id}-${lang}.md`);
    },
    [lang],
  );

  const eksporPng = useCallback(
    async (sk: Skenario | null) => {
      const m = mapRef.current;
      if (!m) return;
      const judul = sk ? `${sk.judul[lang]} · ${terjemah(lang, "scenario_fictional")}` : "EYE OF GARUDA";
      const ok = await fotoPng(m, kanvasRef.current?.canvas ?? null, `eye-of-garuda-${sk?.id ?? "view"}.png`, `${judul} · eye-of-garuda.vercel.app`);
      if (!ok) tampilkanToast(terjemah(lang, "export_png_failed"));
    },
    [mapRef, kanvasRef, lang, tampilkanToast],
  );

  const toggleRekam = useCallback(
    async (sk: Skenario | null) => {
      const m = mapRef.current;
      if (!m) return;
      if (perekamRef.current?.aktif) {
        const b = await perekamRef.current.berhenti();
        setMerekam(false);
        if (b) unduhBlob(b, `eye-of-garuda-${sk?.id ?? "rekaman"}.${perekamRef.current.ekstensi}`);
        return;
      }
      perekamRef.current = new Perekam(m, kanvasRef.current?.canvas ?? null, `${sk?.judul[lang] ?? "EYE OF GARUDA"} · ${terjemah(lang, "scenario_fictional")} · eye-of-garuda.vercel.app`);
      if (perekamRef.current.mulai()) setMerekam(true);
      else tampilkanToast(terjemah(lang, "export_rec_unsupported"));
    },
    [mapRef, kanvasRef, lang, tampilkanToast],
  );

  /** Simulasi berhenti saat masih merekam: hentikan dan unduh hasilnya. */
  const hentikanRekam = useCallback((idSimulasi: string) => {
    if (!perekamRef.current?.aktif) return;
    perekamRef.current.berhenti().then((b) => {
      if (b && perekamRef.current) unduhBlob(b, `eye-of-garuda-${idSimulasi}.${perekamRef.current.ekstensi}`);
    });
    setMerekam(false);
  }, []);

  return { merekam, eksporMd, eksporPng, toggleRekam, hentikanRekam };
}
