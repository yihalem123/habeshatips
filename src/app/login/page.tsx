import { getLocale, t } from "@/lib/i18n";

export const metadata = { title: "Log in" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string; next?: string }> }) {
  const locale = await getLocale();
  const sp = await searchParams;
  return (
    <div className="mx-auto max-w-sm px-4 py-16">
      <h1 className="font-display text-3xl font-semibold">{t(locale, "login")}</h1>
      <p className="mt-2 text-sm text-muted">We send a one-time code to your phone. No password.</p>
      <form method="post" action="/api/auth/request" className="mt-8 space-y-4">
        <input type="hidden" name="next" value={sp.next ?? "/dashboard"} />
        <label className="block text-sm">
          <span className="text-ink-2">{t(locale, "phone")}</span>
          <input
            name="phone"
            type="tel"
            inputMode="tel"
            required
            placeholder="09xx xxx xxx"
            className="num mt-1 w-full rounded border border-line bg-bg-2 px-3 py-2.5 text-ink outline-none focus:border-gold"
          />
        </label>
        {sp.error && <p className="text-sm text-down">{sp.error}</p>}
        <button type="submit" className="w-full rounded bg-gold px-4 py-2.5 font-medium text-black hover:bg-gold-2">
          {t(locale, "sendCode")}
        </button>
      </form>
    </div>
  );
}

// Personalised per request (locale cookie, session): allowed to block instead of prerendering.
export const instant = false;
