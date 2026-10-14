"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function NavLink({ href, label, icon, badge, bottom = false }: { href: string; label: string; icon: React.ReactNode; badge: string | null; bottom?: boolean }) {
  const pathname = usePathname();
  const active = pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
  if (bottom) {
    return (
      <Link href={href} className={`relative flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] font-semibold ${active ? "text-green" : "text-muted"}`}>
        {icon}
        {label}
        {badge && <span className="num absolute right-[22%] top-1.5 rounded-full bg-green px-1.5 text-[10px] font-bold text-on-green">{badge}</span>}
      </Link>
    );
  }
  return (
    <Link
      href={href}
      className={`flex items-center gap-3 rounded-[10px] px-3 py-2.5 text-[14px] font-semibold transition-colors ${active ? "bg-green/10 text-green" : "text-ink-2 hover:bg-white/[0.04] hover:text-ink"}`}
    >
      {icon}
      <span className="flex-1">{label}</span>
      {badge && <span className="num rounded-full bg-green px-2 py-[2px] text-[11px] font-bold text-on-green">{badge}</span>}
    </Link>
  );
}
