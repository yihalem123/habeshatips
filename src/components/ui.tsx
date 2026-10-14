import Link from "next/link";
import { roomMeta } from "@/lib/rooms-meta";

type ButtonProps = {
  href?: string;
  variant?: "primary" | "outline" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  className?: string;
  children: React.ReactNode;
  type?: "submit" | "button";
  external?: boolean;
  disabled?: boolean;
};

export function Button({ href, variant = "primary", size = "md", className = "", children, type = "submit", external, disabled }: ButtonProps) {
  const base = "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[10px] font-bold transition-colors disabled:opacity-50";
  const sizes = { sm: "h-8 px-3 text-[13px]", md: "h-10 px-[18px] text-[14px]", lg: "h-[52px] px-6 text-[15px] rounded-xl font-extrabold" }[size];
  const variants = {
    primary: "bg-green text-on-green hover:bg-green-2",
    outline: "border border-white/10 bg-transparent text-ink hover:border-white/20 hover:bg-white/[0.03]",
    ghost: "text-ink-2 hover:text-ink hover:bg-white/[0.04]",
    danger: "border border-red/40 text-red hover:bg-red/10",
  }[variant];
  const cls = `${base} ${sizes} ${variants} ${className}`;
  if (href) {
    return external ? (
      <a href={href} className={cls} target="_blank" rel="noreferrer">{children}</a>
    ) : (
      <Link href={href} className={cls}>{children}</Link>
    );
  }
  return (
    <button type={type} className={cls} disabled={disabled}>
      {children}
    </button>
  );
}

export function Card({ className = "", children, as: Tag = "div" }: { className?: string; children: React.ReactNode; as?: "div" | "section" | "aside" }) {
  return <Tag className={`card ${className}`}>{children}</Tag>;
}

export function Eyebrow({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`eyebrow ${className}`}>{children}</div>;
}

type ChipTone = "green" | "amber" | "red" | "muted" | "outline" | "solid";
export function Chip({ tone = "outline", children, className = "" }: { tone?: ChipTone; children: React.ReactNode; className?: string }) {
  const tones: Record<ChipTone, string> = {
    green: "border-green/40 text-green",
    amber: "bg-amber/15 text-amber border-transparent",
    red: "border-red/40 text-red",
    muted: "border-transparent bg-white/[0.06] text-ink-2",
    outline: "border-white/10 text-ink-2",
    solid: "border-transparent bg-green text-on-green",
  };
  return <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-[2px] text-[11px] font-bold uppercase tracking-[0.06em] ${tones[tone]} ${className}`}>{children}</span>;
}

export function RoomMark({ slug, size = 30, className = "" }: { slug: string; size?: number; className?: string }) {
  const m = roomMeta(slug);
  return (
    <span
      className={`grid shrink-0 place-items-center font-extrabold text-on-green ${className}`}
      style={{ width: size, height: size, borderRadius: Math.round(size * 0.3), background: m.color, fontSize: Math.round(size * 0.5), color: "#07160c" }}
      aria-hidden
    >
      {m.short}
    </span>
  );
}

export function StatCard({ label, value, sub, tone = "ink", big = false }: { label: string; value: string; sub?: string; tone?: "ink" | "green" | "red" | "muted"; big?: boolean }) {
  const color = { ink: "text-ink", green: "text-green", red: "text-red", muted: "text-muted" }[tone];
  return (
    <div className="card px-5 py-4">
      <Eyebrow>{label}</Eyebrow>
      <div className={`num mt-1.5 font-bold leading-none ${big ? "text-[30px]" : "text-[26px]"} ${color}`}>{value}</div>
      {sub && <div className="mt-1.5 text-[12px] font-medium text-muted">{sub}</div>}
    </div>
  );
}

export function ResultChip({ result, labels }: { result: string; labels: { win: string; loss: string; void: string; pending: string } }) {
  if (result === "win") return <Chip tone="solid">{labels.win}</Chip>;
  if (result === "loss") return <Chip tone="red">{labels.loss}</Chip>;
  if (result === "void") return <Chip tone="muted">{labels.void}</Chip>;
  return <Chip tone="outline">{labels.pending}</Chip>;
}

export function KV({ k, v, tone = "ink" }: { k: string; v: string; tone?: "ink" | "green" | "muted" }) {
  const color = { ink: "text-ink", green: "text-green", muted: "text-muted" }[tone];
  return (
    <div className="flex items-baseline justify-between gap-4 py-1">
      <span className="text-[12px] font-medium text-muted">{k}</span>
      <span className={`num text-[12px] ${color}`}>{v}</span>
    </div>
  );
}

export function PillTabs({ items, className = "" }: { items: { href: string; label: string; active: boolean }[]; className?: string }) {
  return (
    <div className={`pill-tabs inline-flex rounded-[10px] border border-white/10 bg-bg-2 p-[3px] ${className}`}>
      {items.map((it) => (
        <Link key={it.href} href={it.href} data-active={it.active}>
          {it.label}
        </Link>
      ))}
    </div>
  );
}

export function SectionTitle({ title, sub, action }: { title: string; sub?: string; action?: React.ReactNode }) {
  return (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h2 className="text-[20px] font-extrabold tracking-tight">{title}</h2>
        {sub && <p className="mt-1 text-[13px] text-muted">{sub}</p>}
      </div>
      {action}
    </div>
  );
}

export function Logo({ size = 30 }: { size?: number }) {
  return (
    <span className="flex items-center gap-2.5">
      <span className="grid place-items-center rounded-[9px] bg-green font-extrabold" style={{ width: size, height: size, color: "#07160c", fontSize: Math.round(size * 0.5) }}>
        H
      </span>
      <span className="text-[16px] font-extrabold tracking-tight text-ink">HabeshaTips</span>
    </span>
  );
}
