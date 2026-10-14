import { RoomCard } from "@/components/room-card";
import { getLocale, t } from "@/lib/i18n";
import { getRooms } from "@/lib/queries";

export const metadata = { title: "Rooms" };

export default async function RoomsPage() {
  const locale = await getLocale();
  const rooms = await getRooms();
  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <h1 className="font-display text-3xl font-semibold">{t(locale, "rooms")}</h1>
      <p className="mt-1 max-w-2xl text-sm text-muted">
        Each room is a fixed strategy applied to the same daily analysis. The persona shapes the writing, never the pick.
      </p>
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {rooms.map((r) => (
          <RoomCard key={r.room.id} {...r} locale={locale} />
        ))}
      </div>
    </div>
  );
}

// Personalised per request (locale cookie, session): allowed to block instead of prerendering.
export const instant = false;
