import { RoomCard } from "@/components/room-card";
import { PillTabs } from "@/components/ui";
import { getLocale, t } from "@/lib/i18n";
import { activeRoomIds, getRooms } from "@/lib/queries";
import { getSessionUserId } from "@/lib/session";

export const metadata = { title: "Rooms" };

export default async function RoomsPage({ searchParams }: { searchParams: Promise<{ f?: string }> }) {
  const locale = await getLocale();
  const { f = "all" } = await searchParams;
  const [rooms, uid] = await Promise.all([getRooms(), getSessionUserId()]);
  const mine = await activeRoomIds(uid);
  const filtered = rooms.filter((r) => {
    const markets = (r.room.strategyConfig as { markets?: string[] }).markets ?? [];
    if (f === "1x2") return markets.includes("1X2");
    if (f === "goals") return markets.some((m) => m !== "1X2");
    if (f === "mine") return mine.has(r.room.id);
    return true;
  });
  return (
    <div className="mx-auto max-w-[1240px]" id="pricing">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-extrabold tracking-tight">{t(locale, "rooms")}</h1>
          <p className="mt-1 max-w-[560px] text-[13px] text-muted">{t(locale, "roomsSub")}</p>
        </div>
        <PillTabs
          items={[
            { href: "/rooms?f=all", label: t(locale, "all"), active: f === "all" },
            { href: "/rooms?f=1x2", label: "1X2", active: f === "1x2" },
            { href: "/rooms?f=goals", label: "Goals", active: f === "goals" },
            ...(uid ? [{ href: "/rooms?f=mine", label: t(locale, "yourRooms"), active: f === "mine" }] : []),
          ]}
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {filtered.map((r) => (
          <RoomCard key={r.room.id} room={r.room} live={r.live} backtest={r.backtest} locale={locale} />
        ))}
      </div>
    </div>
  );
}

// Personalised per request (locale cookie, session): allowed to block instead of prerendering.
export const instant = false;
