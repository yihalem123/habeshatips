/** Visual identity per room: two-letter mark and the one colour that room owns. */
export const ROOM_META: Record<string, { short: string; color: string }> = {
  "safe-bet": { short: "SB", color: "#3ddc84" },
  "value-hunter": { short: "VH", color: "#a78bfa" },
  "goal-rush": { short: "GR", color: "#fb923c" },
  lockdown: { short: "LD", color: "#60a5fa" },
  "home-fortress": { short: "HF", color: "#fbbf24" },
  "draw-master": { short: "DM", color: "#2dd4bf" },
};

export function roomMeta(slug: string) {
  return ROOM_META[slug] ?? { short: slug.slice(0, 2).toUpperCase(), color: "#8a919d" };
}

export function roomMarkets(config: unknown): string {
  const m = (config as { markets?: string[] } | null)?.markets ?? [];
  return m.map((x) => (x === "OU25" ? "O/U 2.5" : x)).join(" · ");
}

export function roomMaxPerDay(config: unknown): number {
  return (config as { maxTipsPerDay?: number } | null)?.maxTipsPerDay ?? 3;
}

export interface RoomRule {
  label: string;
  value: string;
}

export function roomRules(config: unknown): RoomRule[] {
  return ((config as { rules?: RoomRule[] } | null)?.rules ?? []).slice(0, 6);
}
