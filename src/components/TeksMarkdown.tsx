import { uraiMarkdown, type Potongan } from "@/lib/markdownRingan";

function Inline({ isi }: { isi: Potongan[] }) {
  return (
    <>
      {isi.map((p, i) => {
        if (p.t === "tebal") return <strong key={i} className="font-semibold text-text">{p.isi}</strong>;
        if (p.t === "miring") return <em key={i}>{p.isi}</em>;
        if (p.t === "kode") return <code key={i} className="bg-white/10 px-1 text-[0.95em]">{p.isi}</code>;
        if (p.t === "tautan")
          return (
            <a key={i} href={p.url} target="_blank" rel="noopener noreferrer" className="text-accent underline underline-offset-2">
              {p.isi}
            </a>
          );
        return <span key={i}>{p.isi}</span>;
      })}
    </>
  );
}

/** Jawaban asisten dengan Markdown dasar (tebal, miring, kode, tautan, daftar). */
export default function TeksMarkdown({ teks }: { teks: string }) {
  const blok = uraiMarkdown(teks);
  return (
    <div className="space-y-1.5">
      {blok.map((b, i) => {
        if (b.t === "p")
          return (
            <p key={i} className="whitespace-pre-wrap">
              <Inline isi={b.isi} />
            </p>
          );
        const Daftar = b.t;
        return (
          <Daftar key={i} className={`space-y-0.5 pl-4 ${b.t === "ul" ? "list-disc" : "list-decimal"}`}>
            {b.butir.map((butir, j) => (
              <li key={j}>
                <Inline isi={butir} />
              </li>
            ))}
          </Daftar>
        );
      })}
    </div>
  );
}
