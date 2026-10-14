import { Button, Logo } from "@/components/ui";
import { getLocale, t } from "@/lib/i18n";

export const metadata = { title: "Log in" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string; next?: string }> }) {
  const locale = await getLocale();
  const sp = await searchParams;
  return (
    <div className="mx-auto max-w-[520px] px-5 py-14">
      <div className="card p-7">
        <Logo size={28} />
        <h1 className="mt-6 text-[26px] font-extrabold tracking-tight">{t(locale, "loginTitle")}</h1>
        <p className="mt-1.5 text-[13.5px] text-muted">{t(locale, "loginSub")}</p>
        <form method="post" action="/api/auth/request" className="mt-7 space-y-4">
          <input type="hidden" name="next" value={sp.next ?? "/dashboard"} />
          <label className="block">
            <span className="eyebrow">{t(locale, "phone")}</span>
            <span className="mt-1.5 flex h-12 items-center overflow-hidden rounded-xl border border-white/10 bg-bg-2 focus-within:border-green">
              <span className="num border-r border-white/10 px-3 text-[14px] text-muted">+251</span>
              <input name="phone" type="tel" inputMode="tel" required placeholder="91 123 4567" className="num h-full w-full bg-transparent px-3 text-[16px] text-ink outline-none placeholder:text-muted" />
            </span>
          </label>
          {sp.error && <p className="text-[13px] text-red">{sp.error}</p>}
          <Button size="lg" className="w-full">{t(locale, "sendCode")}</Button>
        </form>
        <p className="mt-6 text-[11.5px] leading-relaxed text-muted">{t(locale, "loginTerms")}</p>
      </div>
    </div>
  );
}

// Personalised per request (locale cookie, session): allowed to block instead of prerendering.
export const instant = false;
