import Link from "next/link";
import { t, type Locale } from "@/lib/i18n";
import { PERIODS, type Period } from "@/lib/queries";

export function PeriodTabs({ current, locale, basePath }: { current: Period; locale: Locale; basePath: string }) {
  return (
    <div className="inline-flex rounded-md border border-line bg-bg-2 p-0.5 text-sm">
      {PERIODS.map((p) => (
        <Link
          key={p}
          href={`${basePath}?period=${p}`}
          className={`rounded px-3 py-1.5 transition-colors ${p === current ? "bg-surface-2 text-ink" : "text-muted hover:text-ink"}`}
        >
          {t(locale, `period_${p}` as const)}
        </Link>
      ))}
    </div>
  );
}
