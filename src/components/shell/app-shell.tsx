import Link from "next/link";
import { IconGrid, IconHome, IconLogout, IconSearch, IconShield, IconTrophy } from "@/components/icons";
import { Logo } from "@/components/ui";
import { t, type Locale } from "@/lib/i18n";
import { LocaleToggle } from "./public-nav";
import { NavLink } from "./nav-link";

export function AppShell({ locale, user, todayCount, children }: { locale: Locale; user: { phone: string | null; isAdmin: boolean }; todayCount: number; children: React.ReactNode }) {
  const items = [
    { href: "/dashboard", label: t(locale, "dashboard"), icon: <IconHome />, badge: todayCount > 0 ? String(todayCount) : null },
    { href: "/leaderboard", label: t(locale, "leaderboard"), icon: <IconTrophy />, badge: null },
    { href: "/rooms", label: t(locale, "rooms"), icon: <IconGrid />, badge: null },
    ...(user.isAdmin ? [{ href: "/admin", label: t(locale, "admin"), icon: <IconShield />, badge: null }] : []),
  ];
  return (
    <div className="flex min-h-screen">
      <aside className="sticky top-0 hidden h-screen w-[208px] shrink-0 flex-col border-r border-white/[0.06] bg-bg px-3 py-4 md:flex">
        <Link href="/dashboard" className="px-2 py-2" aria-label="HabeshaTips">
          <Logo />
        </Link>
        <nav className="mt-4 flex flex-col gap-1">
          {items.map((it) => (
            <NavLink key={it.href} href={it.href} label={it.label} icon={it.icon} badge={it.badge} />
          ))}
        </nav>
        <div className="mt-auto">
          <div className="card flex items-center gap-3 px-3 py-2.5">
            <span className="grid h-8 w-8 place-items-center rounded-full bg-surface-3 text-[12px] font-extrabold text-ink-2">
              {(user.phone ?? "+").slice(-2)}
            </span>
            <div className="min-w-0">
              <div className="num truncate text-[12px] text-ink">{user.phone}</div>
              <form method="post" action="/api/auth/logout">
                <button className="flex items-center gap-1 text-[11px] font-semibold text-muted hover:text-ink">
                  <IconLogout size={12} /> {t(locale, "logout")}
                </button>
              </form>
            </div>
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-white/[0.06] bg-bg/90 px-4 backdrop-blur md:px-6">
          <Link href="/dashboard" className="md:hidden" aria-label="HabeshaTips">
            <Logo size={26} />
          </Link>
          <form action="/search" className="hidden max-w-[360px] flex-1 items-center gap-2 rounded-[10px] border border-white/10 bg-surface px-3 md:flex">
            <IconSearch className="text-muted" size={16} />
            <input name="q" placeholder={t(locale, "searchPlaceholder")} className="h-9 w-full bg-transparent text-[13px] text-ink outline-none placeholder:text-muted" />
          </form>
          <div className="ml-auto flex items-center gap-2">
            <LocaleToggle locale={locale} />
          </div>
        </header>
        <main className="flex-1 px-4 pb-24 pt-6 md:px-8 md:pb-10">{children}</main>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-40 flex border-t border-white/[0.08] bg-bg/95 backdrop-blur md:hidden">
        {items.slice(0, 3).map((it) => (
          <NavLink key={it.href} href={it.href} label={it.label} icon={it.icon} badge={it.badge} bottom />
        ))}
        <Link href="/search" className="flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] font-semibold text-muted">
          <IconSearch size={20} />
          {t(locale, "search")}
        </Link>
      </nav>
    </div>
  );
}
