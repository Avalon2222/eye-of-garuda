/** Lambang: mata di dalam sayap bergaya garis, dibuat sendiri (bukan logo resmi mana pun). */
export default function Logo({ size = 28, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" className={className} aria-hidden="true">
      {/* sayap kiri */}
      <path d="M30 34 L4 18 L12 30 L2 30 L13 38 L5 42 L18 44 L14 52 L28 44 Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" fill="none" />
      {/* sayap kanan */}
      <path d="M34 34 L60 18 L52 30 L62 30 L51 38 L59 42 L46 44 L50 52 L36 44 Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" fill="none" />
      {/* mata */}
      <path d="M18 32 Q32 18 46 32 Q32 46 18 32 Z" stroke="currentColor" strokeWidth="2.2" fill="none" />
      <circle cx="32" cy="32" r="5.5" fill="currentColor" />
      <circle cx="34" cy="30" r="1.6" fill="#05080f" />
    </svg>
  );
}
