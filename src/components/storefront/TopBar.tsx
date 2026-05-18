/**
 * Slim location strip above the nav. Server Component — pure static markup.
 * Replaced the noisier 3-span top bar per the 2026-05 client feedback.
 */
export function TopBar() {
  return (
    <div className="border-b border-[color:var(--gold-20,rgba(201,162,75,0.20))] bg-background py-2 text-center">
      <span className="font-mono text-[10px] uppercase tracking-[0.24em] text-[color:var(--color-gold)]">
        ✦ Quezon City · Philippines
      </span>
    </div>
  );
}
