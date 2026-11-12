import { useCallback, useRef, useState, type RefObject } from "react";
import type { LayerId } from "@/lib/layers";
import type { PelacakSatelit } from "@/lib/live/satelit";
import { PenjadwalLintasan, type Lintasan } from "@/lib/live/lintasan";

interface Opsi {
  satelitRef: RefObject<PelacakSatelit | null>;
  aktifRef: RefObject<Set<LayerId>>;
  toggleLapisan: (id: LayerId) => void;
}

/** Panel jadwal lintasan satelit (tombol O): dihitung di worker, hasil disimpan 15 menit. */
export function useJadwalSatelit({ satelitRef, aktifRef, toggleLapisan }: Opsi) {
  const penjadwalRef = useRef<PenjadwalLintasan | null>(null);
  const [jadwal, setJadwal] = useState(false);
  const [lintasan, setLintasan] = useState<{ daftar: Lintasan[]; sekarang: number[]; dihitung: number } | null>(null);
  const [hitungLintasan, setHitungLintasan] = useState(false);

  const hitungJadwal = useCallback(() => {
    const s = satelitRef.current;
    if (!s || !s.daftar.length) return;
    if (!penjadwalRef.current) penjadwalRef.current = new PenjadwalLintasan();
    setHitungLintasan(true);
    penjadwalRef.current.hitung(s.daftar.map((a) => a.meta), 12).then((h) => {
      setHitungLintasan(false);
      if (h) setLintasan({ daftar: h.lintasan, sekarang: h.sekarang, dihitung: h.dihitung });
    });
  }, [satelitRef]);

  const bukaJadwal = useCallback(() => {
    setJadwal((j) => {
      if (!j) {
        if (!aktifRef.current.has("satelit")) toggleLapisan("satelit");
        const segar = !lintasan || Date.now() - lintasan.dihitung > 15 * 60_000;
        if (segar) setTimeout(hitungJadwal, satelitRef.current?.daftar.length ? 0 : 1500);
      }
      return !j;
    });
  }, [lintasan, hitungJadwal, toggleLapisan, aktifRef, satelitRef]);

  return { jadwal, setJadwal, lintasan, hitungLintasan, hitungJadwal, bukaJadwal };
}
