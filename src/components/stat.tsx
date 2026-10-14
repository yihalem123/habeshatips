export function Stat({ label, value, tone = "neutral", sub, mono = true }: { label: string; value: string; tone?: "neutral" | "up" | "down" | "gold"; sub?: string; mono?: boolean }) {
  const color = tone === "up" ? "text-up" : tone === "down" ? "text-down" : tone === "gold" ? "text-gold" : "text-ink";
  const face = mono ? "num text-2xl" : "font-display text-lg";
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[11px] uppercase tracking-[0.14em] text-muted">{label}</span>
      <span className={`${face} font-medium leading-tight ${color}`}>{value}</span>
      {sub && <span className="text-xs text-muted">{sub}</span>}
    </div>
  );
}

export function Pill({ children, tone = "neutral" }: { children: React.ReactNode; tone?: "neutral" | "up" | "down" | "gold" }) {
  const cls =
    tone === "up"
      ? "border-up/40 text-up"
      : tone === "down"
        ? "border-down/40 text-down"
        : tone === "gold"
          ? "border-gold/50 text-gold"
          : "border-line-2 text-ink-2";
  return <span className={`inline-flex items-center rounded-sm border px-1.5 py-0.5 text-[11px] uppercase tracking-wider ${cls}`}>{children}</span>;
}
