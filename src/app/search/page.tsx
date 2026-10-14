import Link from "next/link";
import { IconSearch } from "@/components/icons";
import { ResultRow } from "@/components/tip-views";
import { RoomMark, SectionTitle } from "@/components/ui";
import { getLocale, pick, t } from "@/lib/i18n";
import { getTip, searchAll } from "@/lib/queries";
import { redirect } from "next/navigation";

export const metadata = { title: "Search" };

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const locale = await getLocale();
  const { q = "" } = await searchParams;
  const trimmed = q.trim();
  // A pasted tip link or id goes straight to the verification page.
  const idMatch = trimmed.match(/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i);
  if (idMatch && (await getTip(idMatch[1]))) redirect(`/tips/${idMatch[1]}`);
  const { rooms, tips } = trimmed ? await searchAll(trimmed) : { rooms: [], tips: [] };
  const hashMatch = trimmed.match(/^[0-9a-f]{12,64}$/i);
  const byHash = hashMatch ? tips.filter((tp) => tp.hash.startsWith(trimmed.toLowerCase())) : [];

  return (
    <div className="mx-auto max-w-[900px]">
      <form action="/search" className="flex items-center gap-2 rounded-xl border border-white/10 bg-surface px-4">
        <IconSearch className="text-muted" />
        <input name="q" defaultValue={q} placeholder={t(locale, "searchPlaceholder")} className="h-12 w-full bg-transparent text-[15px] outline-none placeholder:text-muted" autoFocus />
      </form>
      {trimmed && rooms.length === 0 && tips.length === 0 && byHash.length === 0 && <p className="mt-6 text-[13.5px] text-muted">{t(locale, "noResults")}</p>}
      {rooms.length > 0 && (
        <section className="mt-8">
          <SectionTitle title={t(locale, "roomsFound")} />
          <div className="grid gap-3 sm:grid-cols-2">
            {rooms.map((r) => (
              <Link key={r.id} href={`/rooms/${r.slug}`} className="card flex items-center gap-3 p-4 hover:border-white/20">
                <RoomMark slug={r.slug} size={32} />
                <span>
                  <span className="block text-[14px] font-extrabold">{pick(locale, r.nameEn, r.nameAm)}</span>
                  <span className="block text-[12px] text-muted">{r.persona}</span>
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}
      {tips.length > 0 && (
        <section className="mt-8">
          <SectionTitle title={t(locale, "tipsFound")} />
          <div className="card p-1.5">
            {tips.map((tp) => (
              <ResultRow key={tp.id} tip={tp} locale={locale} showRoom />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

// Personalised per request (locale cookie, session): allowed to block instead of prerendering.
export const instant = false;
