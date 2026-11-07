"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { X, SendHorizontal, Sparkles, LocateFixed, Layers } from "lucide-react";
import Logo from "./Logo";
import { terjemah, type Lang } from "@/lib/i18n";
import { LAPISAN, lapisanDariId, type LayerId } from "@/lib/layers";
import { jawabFaq } from "@/lib/pengetahuan";
import type { Pilihan } from "@/lib/types";
import type { EntriCari } from "./SearchPalette";

interface Pesan {
  peran: "user" | "assistant";
  teks: string;
  /** aksi yang ditawarkan asisten (dari baris @terbang / @lapisan) */
  terbang?: EntriCari;
  lapisan?: LayerId;
  faq?: boolean;
}

interface Props {
  lang: Lang;
  terbuka: boolean;
  onToggle: () => void;
  indeks: EntriCari[];
  aktif: Set<LayerId>;
  jumlah: Partial<Record<LayerId, number>>;
  pilihan: Pilihan | null;
  onTerbang: (e: EntriCari) => void;
  onLapisan: (id: LayerId) => void;
}

type Mode = "ai" | "faq";

function cariEntri(indeks: EntriCari[], nama: string): EntriCari | undefined {
  const q = nama.trim().toLowerCase();
  if (!q) return undefined;
  let terbaik: EntriCari | undefined;
  let nilai = 0;
  for (const e of indeks) {
    const n = e.nama.toLowerCase();
    let s = 0;
    if (n === q) s = 4;
    else if (n.startsWith(q)) s = 3;
    else if (n.includes(q)) s = 2;
    else if (q.includes(n) && n.length > 4) s = 1;
    if (s > nilai) {
      nilai = s;
      terbaik = e;
      if (s === 4) break;
    }
  }
  return terbaik;
}

const KATA_UMUM = new Set(["mana", "dimana", "where", "yang", "apa", "what", "bagaimana", "kenapa", "mengapa", "tolong", "please", "show", "tunjukkan", "lihat", "about", "tentang", "this", "that", "with", "dari", "dengan", "untuk", "lapisan", "layer", "base", "bases", "markas", "pangkalan", "kabel", "cable", "satelit", "satellite"]);

function tokenTanya(q: string): string[] {
  return q
    .toLowerCase()
    .split(/[^a-z0-9\u00C0-\u024F-]+/)
    .filter((k) => k.length >= 4 && !KATA_UMUM.has(k));
}

/** Entitas di peta yang namanya muncul di pertanyaan. Kata yang langka (mis. "ranai") berbobot lebih besar daripada kata umum (mis. "lanud"). */
function petunjukEntitas(indeks: EntriCari[], q: string): EntriCari[] {
  const kata = tokenTanya(q);
  if (kata.length === 0) return [];
  const nama = indeks.map((e) => e.nama.toLowerCase());
  const bobot = kata.map((k) => {
    let n = 0;
    for (const x of nama) if (x.includes(k)) n += 1;
    return n === 0 ? 0 : 1 / Math.log(2 + n);
  });
  const hasil: { e: EntriCari; s: number }[] = [];
  for (let i = 0; i < indeks.length; i++) {
    let s = 0;
    for (let j = 0; j < kata.length; j++) {
      if (bobot[j] > 0 && nama[i].includes(kata[j])) s += bobot[j] * (nama[i].startsWith(kata[j]) ? 1.2 : 1);
    }
    if (s > 0) hasil.push({ e: indeks[i], s });
  }
  hasil.sort((a, b) => b.s - a.s);
  return hasil.slice(0, 6).map((x) => x.e);
}

function pisahkanAksi(teks: string, indeks: EntriCari[]): { teks: string; terbang?: EntriCari; lapisan?: LayerId } {
  let terbang: EntriCari | undefined;
  let lapisan: LayerId | undefined;
  const baris = teks.split("\n").filter((b) => {
    const m = b.match(/^\s*@?(terbang|fly)\s*:\s*(.+)$/i);
    if (m) {
      const nama = m[2].replace(/[*_`"]/g, "");
      terbang = terbang ?? cariEntri(indeks, nama) ?? petunjukEntitas(indeks, nama)[0];
      return false;
    }
    const l = b.match(/^\s*@?(lapisan|layer)\s*:\s*([a-z]+)/i);
    if (l) {
      const id = l[2].toLowerCase();
      if (lapisanDariId(id)) lapisan = id as LayerId;
      return false;
    }
    return true;
  });
  return { teks: baris.join("\n").trim(), terbang, lapisan };
}

export default function ChatWidget({ lang, terbuka, onToggle, indeks, aktif, jumlah, pilihan, onTerbang, onLapisan }: Props) {
  const [pesan, setPesan] = useState<Pesan[]>([]);
  const [teks, setTeks] = useState("");
  const [sibuk, setSibuk] = useState(false);
  const [mode, setMode] = useState<Mode>("ai");
  const daftar = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (terbuka) setTimeout(() => input.current?.focus(), 50);
  }, [terbuka]);
  useEffect(() => {
    daftar.current?.scrollTo({ top: daftar.current.scrollHeight, behavior: "smooth" });
  }, [pesan, sibuk]);

  const konteks = useMemo(() => {
    const l = LAPISAN.filter((x) => aktif.has(x.id)).map((x) => `${x.nama[lang]}${jumlah[x.id] != null ? ` (${jumlah[x.id]})` : ""}`);
    let s = (lang === "en" ? "Active layers: " : "Lapisan aktif: ") + (l.join(", ") || "-") + ".";
    if (pilihan) {
      const p = pilihan.props;
      const ring = ["nama", "jenis", "operator", "negara", "kelas_orbit", "kecepatan", "alt", "kategori", "panjang_km", "tanggal"]
        .filter((k) => p[k] != null && p[k] !== "")
        .map((k) => `${k}=${String(p[k]).slice(0, 60)}`)
        .join(", ");
      s += (lang === "en" ? " Selected object: " : " Objek terpilih: ") + `${lapisanDariId(pilihan.lapisan)?.nama[lang] ?? pilihan.lapisan}: ${ring}.`;
    }
    return s;
  }, [aktif, jumlah, pilihan, lang]);

  const contoh = useMemo(
    () =>
      lang === "en"
        ? ["What am I looking at?", "Where is Lanud Ranai?", "Why do some satellites look higher?", "Which layers are live?"]
        : ["Ini apa sih?", "Lanud Ranai di mana?", "Kenapa satelit ada yang lebih tinggi?", "Lapisan mana yang live?"],
    [lang],
  );

  const kirim = useCallback(
    async (q: string) => {
      const t = q.trim();
      if (!t || sibuk) return;
      setTeks("");
      const riwayatBaru: Pesan[] = [...pesan, { peran: "user", teks: t }];
      setPesan(riwayatBaru);
      setSibuk(true);

      const jawabFaqLokal = () => {
        const f = jawabFaq(t, lang);
        const terbang = (f?.terbang ? cariEntri(indeks, f.terbang) : undefined) ?? petunjukEntitas(indeks, t)[0];
        setPesan((p) => [
          ...p,
          {
            peran: "assistant",
            faq: true,
            teks: f?.teks ?? terjemah(lang, "chat_faq_miss"),
            terbang,
            lapisan: f?.lapisan as LayerId | undefined,
          },
        ]);
      };

      if (mode === "faq") {
        jawabFaqLokal();
        setSibuk(false);
        return;
      }
      try {
        const petunjuk = petunjukEntitas(indeks, t);
        const ctx =
          konteks +
          (petunjuk.length
            ? (lang === "en" ? " Matching map objects: " : " Objek peta yang cocok: ") +
              petunjuk.map((e) => `"${e.nama}" [${lapisanDariId(e.lapisan)?.nama[lang] ?? e.lapisan}${e.sub ? `, ${e.sub}` : ""}]`).join("; ")
            : "");
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            lang,
            konteks: ctx,
            messages: riwayatBaru.slice(-8).map((m) => ({ role: m.peran, content: m.teks })),
          }),
        });
        if (res.status === 503 || res.status === 429 || res.status === 502) {
          setMode("faq");
          jawabFaqLokal();
          return;
        }
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = (await res.json()) as { jawaban: string };
        const { teks: bersih, terbang, lapisan } = pisahkanAksi(data.jawaban, indeks);
        setPesan((p) => [...p, { peran: "assistant", teks: bersih || data.jawaban, terbang, lapisan }]);
      } catch {
        setMode("faq");
        jawabFaqLokal();
      } finally {
        setSibuk(false);
      }
    },
    [pesan, sibuk, mode, lang, indeks, konteks],
  );

  return (
    <>
      {/* tombol Garuda AI: pil dengan logo + label supaya jelas ini asisten AI, bukan sekadar ikon chat */}
      <button
        data-tour="chat"
        className={`tombol-ai pointer-events-auto absolute bottom-[44px] right-2 z-30 sm:right-3 max-sm:bottom-[88px] ${terbuka ? "aktif" : ""} ${pilihan && !terbuka ? "max-sm:hidden" : ""}`}
        onClick={onToggle}
        title={`${terjemah(lang, "chat_button")} (C)`}
        aria-label={terjemah(lang, "chat_button")}
      >
        <span className="tombol-ai-logo">
          <Logo size={22} />
          <Sparkles size={10} className="tombol-ai-kilau" />
        </span>
        <span className="tombol-ai-teks">
          <span className="tombol-ai-judul">{terjemah(lang, "chat_title")}</span>
          <span className="tombol-ai-sub">{terbuka ? terjemah(lang, "close") : terjemah(lang, "chat_hint")}</span>
        </span>
        {terbuka && <X size={14} className="mr-1 shrink-0 text-muted" />}
      </button>

      {terbuka && (
        <section className="glass braket muncul pointer-events-auto absolute bottom-[92px] !bg-[rgba(5,8,15,0.9)] right-2 z-30 flex h-[460px] max-h-[calc(100%-150px)] w-[360px] max-w-[calc(100%-16px)] flex-col sm:right-3 max-sm:bottom-[136px] max-sm:max-h-[55vh]">
          <div className="flex items-center justify-between gap-2 border-b border-white/10 px-3 py-2">
            <div className="flex min-w-0 items-center gap-2">
              <Logo size={20} className="shrink-0 text-accent" />
              <div className="min-w-0">
                <div className="label-kecil truncate text-text">{terjemah(lang, "chat_title")}</div>
                <div className="truncate text-[9.5px] tracking-[0.12em] text-muted">{mode === "ai" ? terjemah(lang, "chat_mode_ai") : terjemah(lang, "chat_mode_faq")}</div>
              </div>
            </div>
            <button className="tombol-ikon !h-7 !w-7" onClick={onToggle} title={terjemah(lang, "close")}>
              <X size={13} />
            </button>
          </div>

          <div ref={daftar} className="gulir flex-1 space-y-2.5 overflow-y-auto px-3 py-3">
            {pesan.length === 0 && (
              <div className="space-y-2">
                <p className="text-[11.5px] leading-relaxed text-muted">{terjemah(lang, "chat_intro")}</p>
                <div className="flex flex-wrap gap-1.5">
                  {contoh.map((c) => (
                    <button key={c} className="tombol-hud !h-auto !py-1 !normal-case !tracking-normal" onClick={() => kirim(c)}>
                      {c}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {pesan.map((m, i) => (
              <div key={i} className={`flex ${m.peran === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[88%] whitespace-pre-wrap px-2.5 py-1.5 text-[11.5px] leading-relaxed ${
                    m.peran === "user" ? "border border-accent/40 bg-accent/10 text-text" : "border border-white/10 bg-white/[0.04] text-text"
                  }`}
                >
                  {m.teks}
                  {(m.terbang || m.lapisan) && (
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {m.lapisan && !aktif.has(m.lapisan) && (
                        <button className="tombol-hud !h-6 !px-2 !text-[10px]" onClick={() => onLapisan(m.lapisan!)}>
                          <Layers size={11} /> {lapisanDariId(m.lapisan)?.nama[lang]}
                        </button>
                      )}
                      {m.terbang && (
                        <button className="tombol-hud aktif !h-6 !px-2 !text-[10px]" onClick={() => onTerbang(m.terbang!)}>
                          <LocateFixed size={11} /> {m.terbang.nama}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {sibuk && (
              <div className="flex justify-start">
                <div className="border border-white/10 bg-white/[0.04] px-2.5 py-1.5 text-[11px] text-muted">
                  <span className="kedip">▍</span>
                </div>
              </div>
            )}
          </div>

          <form
            className="flex items-center gap-1.5 border-t border-white/10 p-2"
            onSubmit={(e) => {
              e.preventDefault();
              kirim(teks);
            }}
          >
            <input
              ref={input}
              value={teks}
              onChange={(e) => setTeks(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Escape") onToggle();
              }}
              placeholder={terjemah(lang, "chat_placeholder")}
              maxLength={500}
              className="h-8 min-w-0 flex-1 border border-white/10 bg-black/30 px-2.5 text-[12px] text-text outline-none placeholder:text-muted/70 focus:border-accent/60"
            />
            <button type="submit" className="tombol-ikon !h-8 !w-8" disabled={sibuk || !teks.trim()} title={terjemah(lang, "chat_send")}>
              <SendHorizontal size={14} />
            </button>
          </form>
          <div className="px-3 pb-1.5 text-[9px] leading-snug text-muted/80">{terjemah(lang, "chat_caveat")}</div>
        </section>
      )}
    </>
  );
}
