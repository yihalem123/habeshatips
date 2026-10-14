import Link from "next/link";
import { Button, Logo } from "@/components/ui";
import { t, type Locale } from "@/lib/i18n";

export function LocaleToggle({ locale }: { locale: Locale }) {
  const other = locale === "am" ? "en" : "am";
  return (
    <a href={`/api/locale?set=${other}`} className="inline-flex h-9 items-center rounded-[9px] border border-white/10 px-3 text-[12px] font-bold text-ink-2 hover:text-ink">
      {other === "am" ? "አማ" : "EN"}
    </a>
  );
}

export function PublicNav({ locale }: { locale: Locale }) {
  return (
    <header className="sticky top-0 z-40 border-b border-white/[0.06] bg-bg/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-[1240px] items-center justify-between px-5">
        <Link href="/" aria-label="HabeshaTips">
          <Logo />
        </Link>
        <nav className="hidden items-center gap-1 text-[14px] font-semibold text-ink-2 md:flex">
          <Link href="/leaderboard" className="rounded-lg px-3 py-2 hover:text-ink">{t(locale, "leaderboard")}</Link>
          <Link href="/rooms" className="rounded-lg px-3 py-2 hover:text-ink">{t(locale, "rooms")}</Link>
          <Link href="/how-it-works" className="rounded-lg px-3 py-2 hover:text-ink">{t(locale, "howItWorks")}</Link>
          <Link href="/rooms#pricing" className="rounded-lg px-3 py-2 hover:text-ink">{t(locale, "pricing")}</Link>
        </nav>
        <div className="flex items-center gap-2">
          <LocaleToggle locale={locale} />
          <Button href="/login" variant="outline" size="sm" className="h-9">{t(locale, "login")}</Button>
          <Button href="/login?next=/rooms" size="sm" className="h-9">{t(locale, "startFree")}</Button>
        </div>
      </div>
    </header>
  );
}
