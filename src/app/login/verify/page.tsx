import Link from "next/link";
import { Button, Logo } from "@/components/ui";
import { getLocale, t } from "@/lib/i18n";

export const metadata = { title: "Verify" };

export default async function VerifyPage({ searchParams }: { searchParams: Promise<{ phone?: string; next?: string; error?: string; dev?: string }> }) {
  const locale = await getLocale();
  const sp = await searchParams;
  return (
    <div className="mx-auto max-w-[520px] px-5 py-14">
      <div className="card p-7">
        <Logo size={28} />
        <Link href={`/login?next=${encodeURIComponent(sp.next ?? "/dashboard")}`} className="mt-6 inline-block text-[12.5px] font-bold text-muted hover:text-ink">
          ← {t(locale, "changeNumber")}
        </Link>
        <h1 className="mt-2 text-[26px] font-extrabold tracking-tight">{t(locale, "enterCode")}</h1>
        <p className="num mt-1.5 text-[13.5px] text-muted">
          {t(locale, "sentTo")} <span className="text-ink">{sp.phone}</span>
        </p>
        <form method="post" action="/api/auth/verify" className="mt-7 space-y-4">
          <input type="hidden" name="phone" value={sp.phone ?? ""} />
          <input type="hidden" name="next" value={sp.next ?? "/dashboard"} />
          <input
            name="code"
            inputMode="numeric"
            pattern="[0-9]{6}"
            maxLength={6}
            required
            autoFocus
            autoComplete="one-time-code"
            className="num h-14 w-full rounded-xl border border-white/10 bg-bg-2 text-center text-[28px] tracking-[0.5em] text-ink outline-none focus:border-green"
          />
          {sp.dev && <p className="num text-[12px] text-green">dev code: {sp.dev}</p>}
          {sp.error && <p className="text-[13px] text-red">{sp.error}</p>}
          <Button size="lg" className="w-full">{t(locale, "verifyContinue")}</Button>
        </form>
        <form method="post" action="/api/auth/request" className="mt-4 text-[12.5px] text-muted">
          <input type="hidden" name="phone" value={sp.phone ?? ""} />
          <input type="hidden" name="next" value={sp.next ?? "/dashboard"} />
          <button className="font-bold text-ink-2 hover:text-ink">{t(locale, "didntGet")}</button>
        </form>
      </div>
    </div>
  );
}

// Personalised per request (locale cookie, session): allowed to block instead of prerendering.
export const instant = false;
