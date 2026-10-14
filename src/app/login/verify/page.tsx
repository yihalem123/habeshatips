import { getLocale, t } from "@/lib/i18n";

export const metadata = { title: "Verify" };

export default async function VerifyPage({ searchParams }: { searchParams: Promise<{ phone?: string; next?: string; error?: string; dev?: string }> }) {
  const locale = await getLocale();
  const sp = await searchParams;
  return (
    <div className="mx-auto max-w-sm px-4 py-16">
      <h1 className="font-display text-3xl font-semibold">{t(locale, "verify")}</h1>
      <p className="num mt-2 text-sm text-muted">{sp.phone}</p>
      <form method="post" action="/api/auth/verify" className="mt-8 space-y-4">
        <input type="hidden" name="phone" value={sp.phone ?? ""} />
        <input type="hidden" name="next" value={sp.next ?? "/dashboard"} />
        <label className="block text-sm">
          <span className="text-ink-2">{t(locale, "code")}</span>
          <input
            name="code"
            inputMode="numeric"
            pattern="[0-9]{6}"
            maxLength={6}
            required
            autoFocus
            className="num mt-1 w-full rounded border border-line bg-bg-2 px-3 py-2.5 text-center text-2xl tracking-[0.4em] text-ink outline-none focus:border-gold"
          />
        </label>
        {sp.dev && <p className="num text-xs text-gold">dev code: {sp.dev}</p>}
        {sp.error && <p className="text-sm text-down">{sp.error}</p>}
        <button type="submit" className="w-full rounded bg-gold px-4 py-2.5 font-medium text-black hover:bg-gold-2">
          {t(locale, "verify")}
        </button>
      </form>
    </div>
  );
}

// Personalised per request (locale cookie, session): allowed to block instead of prerendering.
export const instant = false;
