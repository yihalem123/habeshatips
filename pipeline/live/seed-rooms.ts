/** Upsert the rooms defined in pipeline/rooms/config.ts into the database. */
import { sql } from "drizzle-orm";
import { closeDb, db, schema } from "./db";
import { ROOMS } from "../rooms/config";

export async function seedRooms() {
  const price = Number(process.env.ROOM_PRICE_ETB ?? "0"); // TODO: set real per-room prices
  for (const r of ROOMS) {
    await db
      .insert(schema.rooms)
      .values({
        id: `room-${r.slug}`,
        slug: r.slug,
        nameEn: r.nameEn,
        nameAm: r.nameAm,
        persona: r.persona,
        strategyConfig: { markets: r.markets, maxTipsPerDay: r.maxTipsPerDay, minEvidence: r.minEvidence },
        priceEtb: price,
      })
      .onConflictDoUpdate({
        target: schema.rooms.slug,
        set: { nameEn: sql`excluded.name_en`, nameAm: sql`excluded.name_am`, persona: sql`excluded.persona`, strategyConfig: sql`excluded.strategy_config` },
      });
  }
  console.log(`seeded ${ROOMS.length} rooms`);
}

if (process.argv[1]?.endsWith("seed-rooms.ts")) {
  seedRooms().finally(() => closeDb());
}
