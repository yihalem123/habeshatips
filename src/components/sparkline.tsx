/** Equity curve as an SVG line: green when the latest value is ≥ 0, red otherwise. */
export function Sparkline({ points, width = 120, height = 28, className = "" }: { points: number[]; width?: number; height?: number; className?: string }) {
  if (points.length < 2) return <svg width={width} height={height} className={className} aria-hidden />;
  const min = Math.min(0, ...points);
  const max = Math.max(0, ...points);
  const span = max - min || 1;
  const x = (i: number) => (i / (points.length - 1)) * (width - 2) + 1;
  const y = (v: number) => height - 2 - ((v - min) / span) * (height - 4);
  const d = points.map((v, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  const last = points[points.length - 1];
  const stroke = last >= 0 ? "#3ddc84" : "#f87171";
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className={className} aria-hidden>
      <path d={d} fill="none" stroke={stroke} strokeWidth={1.6} strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

/** Larger chart with zero line and x labels (dates), used on room pages. */
export function EquityChart({ points, labels, height = 180 }: { points: number[]; labels: string[]; height?: number }) {
  const width = 800;
  if (points.length < 2) return <div className="grid h-[180px] place-items-center text-[12px] text-muted">—</div>;
  const min = Math.min(0, ...points);
  const max = Math.max(0, ...points);
  const span = max - min || 1;
  const pad = 8;
  const x = (i: number) => pad + (i / (points.length - 1)) * (width - pad * 2);
  const y = (v: number) => pad + (1 - (v - min) / span) * (height - pad * 2);
  const d = points.map((v, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  const last = points[points.length - 1];
  const stroke = last >= 0 ? "#3ddc84" : "#f87171";
  const area = `${d} L${x(points.length - 1).toFixed(1)},${y(0).toFixed(1)} L${x(0).toFixed(1)},${y(0).toFixed(1)} Z`;
  return (
    <div>
      <svg viewBox={`0 0 ${width} ${height}`} className="h-[180px] w-full" preserveAspectRatio="none" aria-hidden>
        <defs>
          <linearGradient id="eq-fill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor={stroke} stopOpacity="0.18" />
            <stop offset="1" stopColor={stroke} stopOpacity="0" />
          </linearGradient>
        </defs>
        <line x1={pad} x2={width - pad} y1={y(0)} y2={y(0)} stroke="rgba(255,255,255,0.12)" strokeDasharray="3 4" />
        <path d={area} fill="url(#eq-fill)" />
        <path d={d} fill="none" stroke={stroke} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
      </svg>
      <div className="num mt-2 flex justify-between text-[11px] text-muted">
        {labels.map((l, i) => (
          <span key={i}>{l}</span>
        ))}
      </div>
    </div>
  );
}
