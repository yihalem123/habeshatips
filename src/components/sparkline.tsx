/** Equity curve as a bare SVG line with a zero baseline. Server-rendered, no library. */
export function Sparkline({ points, width = 160, height = 44, className = "" }: { points: number[]; width?: number; height?: number; className?: string }) {
  if (points.length < 2) {
    return <svg width={width} height={height} className={className} aria-hidden />;
  }
  const min = Math.min(0, ...points);
  const max = Math.max(0, ...points);
  const span = max - min || 1;
  const x = (i: number) => (i / (points.length - 1)) * (width - 2) + 1;
  const y = (v: number) => height - 2 - ((v - min) / span) * (height - 4);
  const d = points.map((v, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  const last = points[points.length - 1];
  const stroke = last >= 0 ? "var(--color-up)" : "var(--color-down)";
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className={className} aria-hidden>
      <line x1={0} x2={width} y1={y(0)} y2={y(0)} stroke="var(--color-line-2)" strokeDasharray="2 3" />
      <path d={d} fill="none" stroke={stroke} strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={x(points.length - 1)} cy={y(last)} r={2.2} fill={stroke} />
    </svg>
  );
}
