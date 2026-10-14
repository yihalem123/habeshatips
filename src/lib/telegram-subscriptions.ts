/** Invite links for a user's active rooms (created lazily; one single-use link per subscription). */
import { and, eq, gte } from "drizzle-orm";
import { db } from "@/db";
import { rooms, subscriptions } from "@/db/schema";
import { createInviteLink, telegramConfigured } from "./telegram";

export async function ensureInviteLinks(userId: string): Promise<{ roomSlug: string; roomName: string; link: string | null }[]> {
  const rows = await db
    .select()
    .from(subscriptions)
    .innerJoin(rooms, eq(subscriptions.roomId, rooms.id))
    .where(and(eq(subscriptions.userId, userId), eq(subscriptions.status, "active"), gte(subscriptions.endsAt, new Date())));
  const out = [];
  for (const { subscriptions: sub, rooms: room } of rows) {
    let link = sub.telegramInviteLink;
    if (!link && room.telegramChannelId && telegramConfigured()) {
      try {
        link = await createInviteLink(room.telegramChannelId, `sub:${sub.id.slice(0, 8)}`);
        await db.update(subscriptions).set({ telegramInviteLink: link }).where(eq(subscriptions.id, sub.id));
      } catch (err) {
        console.warn(`invite link for ${room.slug}: ${(err as Error).message}`);
      }
    }
    out.push({ roomSlug: room.slug, roomName: room.nameEn, link });
  }
  return out;
}
