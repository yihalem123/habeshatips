import Link from "next/link";
import { Logo } from "@/components/ui";
import { t, type Locale } from "@/lib/i18n";

const YEAR = new Date().getFullYear();

export function Footer({ locale, compact = false }: { locale: Locale; compact?: boolean }) {
  return (
    <footer className={`border-t border-white/[0.06] ${compact ? "" : "mt-10"}`}>
      <div className="mx-auto flex max-w-[1240px] flex-col gap-5 px-5 py-8 md:flex-row md:items-start md:justify-between">
        <div className="max-w-md">
          <Logo size={26} />
          <p className="mt-3 text-[12.5px] leading-relaxed text-muted">
            {t(locale, "disclaimer")} {t(locale, "responsible")}
          </p>
          <p className="mt-2 text-[12px] text-muted">© {YEAR} HabeshaTips</p>
        </div>
        <nav className="flex flex-wrap items-center gap-5 text-[13px] font-semibold text-ink-2">
          <Link href="/how-it-works" className="hover:text-ink">{t(locale, "howItWorks")}</Link>
          <Link href="/responsible-gambling" className="hover:text-ink">{t(locale, "responsibleGambling")}</Link>
          <Link href="/terms" className="hover:text-ink">{t(locale, "terms")}</Link>
          <Link href="/privacy" className="hover:text-ink">{t(locale, "privacy")}</Link>
          <span className="num rounded-md border border-white/10 px-2 py-0.5 text-[11px] text-muted">18+</span>
        </nav>
      </div>
    </footer>
  );
}
