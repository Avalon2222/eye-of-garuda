import KonsolKlien from "@/components/KonsolKlien";

export default function Halaman() {
  return (
    <>
      {/* judul + ringkasan ikut di HTML server, jadi mesin pencari dan pembaca layar tetap dapat isinya */}
      <h1 className="sr-only">Eye of Garuda: konsol globe pertahanan Indonesia</h1>
      <p className="sr-only">
        Globe interaktif dari data publik: markas TNI, pangkalan asing di kawasan, pulau terluar, ALKI, kabel bawah
        laut, pesawat militer live, satelit, kapal AIS, ZEE, dan simulasi War Room.
      </p>
      <KonsolKlien />
    </>
  );
}
