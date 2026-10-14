import Link from "next/link";
import { t, type Locale } from "@/lib/i18n";

export function Nav({ locale, user }: { locale: Locale; user: { id: string; isAdmin: boolean } | null }) {
  const other = locale === "am" ? "en" : "am";
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-bg/85 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <Link href="/" className="font-display text-lg font-semibold tracking-tight">
          Habesha<span className="text-gold">Tips</span>
        </Link>
        <nav className="hidden items-center gap-6 text-sm text-ink-2 md:flex">
          <Link href="/leaderboard" className="hover:text-ink">{t(locale, "leaderboard")}</Link>
          <Link href="/rooms" className="hover:text-ink">{t(locale, "rooms")}</Link>
          <Link href="/how-it-works" className="hover:text-ink">{t(locale, "howItWorks")}</Link>
          {user?.isAdmin && <Link href="/admin" className="hover:text-ink">Admin</Link>}
        </nav>
        <div className="flex items-center gap-3 text-sm">
          <a href={`/api/locale?set=${other}`} className="rounded border border-line px-2 py-1 text-xs text-ink-2 hover:border-line-2 hover:text-ink">
            {other === "am" ? "አማ" : "EN"}
          </a>
          {user ? (
            <Link href="/dashboard" className="rounded bg-surface-2 px-3 py-1.5 text-ink hover:bg-line">
              {t(locale, "dashboard")}
            </Link>
          ) : (
            <Link href="/login" className="rounded bg-gold px-3 py-1.5 font-medium text-black hover:bg-gold-2">
              {t(locale, "login")}
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
