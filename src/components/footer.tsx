import Link from "next/link";
import { t, type Locale } from "@/lib/i18n";

// Evaluated once at module load, not during render, so static shells can prerender.
const YEAR = new Date().getFullYear();

export function Footer({ locale }: { locale: Locale }) {
  return (
    <footer className="border-t border-line">
      <div className="mx-auto max-w-6xl px-4 py-10 text-sm text-muted">
        <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
          <div className="max-w-md">
            <div className="font-display text-base text-ink">HabeshaTips</div>
            <p className="mt-2 leading-relaxed">{t(locale, "disclaimer")}</p>
            <p className="mt-2 leading-relaxed text-ink-2">{t(locale, "responsible")}</p>
          </div>
          <nav className="flex gap-6">
            <Link href="/how-it-works" className="hover:text-ink">{t(locale, "howItWorks")}</Link>
            <Link href="/responsible-gambling" className="hover:text-ink">{t(locale, "responsibleGambling")}</Link>
            <Link href="/terms" className="hover:text-ink">{t(locale, "terms")}</Link>
            <Link href="/privacy" className="hover:text-ink">{t(locale, "privacy")}</Link>
          </nav>
        </div>
        <div className="mt-8 flex items-center justify-between border-t border-line pt-6 text-xs">
          <span>© {YEAR} HabeshaTips</span>
          <span className="num">18+</span>
        </div>
      </div>
    </footer>
  );
}
