/**
 * Apply room filters to a day's analyses and write immutable tips.
 * basis "model": blended model probabilities. basis "claude": Claude's final probabilities.
 */
import crypto from "node:crypto";
import { and, eq, inArray } from "drizzle-orm";
import { db, schema } from "./db";
import { fixturesOn } from "./analyze";
import { latestAnalyses } from "./latest";
import { ROOMS, type Candidate, type MatchContext } from "../rooms/config";
import type { Prediction } from "../model/dixon-coles";
import type { MatchAnalysis } from "../analysis/schema";

export type Basis = "model" | "claude";

export function tipHash(parts: Record<string, string | number>): string {
  const raw = Object.keys(parts)
    .sort()
    .map((k) => `${k}=${parts[k]}`)
    .join("|");
  return crypto.createHash("sha256").update(raw).digest("hex");
}

export async function publishDate(date: string, basis: Basis, opts: { allowFinished?: boolean } = {}) {
  const fixtures = await fixturesOn(date);
  if (fixtures.length === 0) return 0;
  const analyses = Array.from((await latestAnalyses(fixtures.map((f) => f.id))).values());
  const roomRows = await db.select().from(schema.rooms);
  const roomIdBySlug = new Map(roomRows.map((r) => [r.slug, r.id]));

  const candidates = new Map<string, { fixtureId: string; analysisId: string; c: Candidate; text: { en: string; am: string } }[]>();

  for (const a of analyses) {
    const f = fixtures.find((x) => x.id === a.fixtureId)!;
    if (f.status !== "scheduled" && !opts.allowFinished) continue;
    const probs = a.modelProbs as { raw: Prediction; blended: Prediction };
    const features = a.features as {
      odds1x2: MatchContext["odds1x2"];
      oddsOU: MatchContext["oddsOU"];
      oddsBtts: MatchContext["oddsBtts"];
      forms: Pick<MatchContext, "homeForm" | "awayForm" | "homeHomeForm" | "awayAwayForm">;
    };
    const llm = a.llmOutput as MatchAnalysis | null;
    if (basis === "claude" && !llm) continue;

    const pred: Prediction =
      basis === "claude"
        ? {
            ...probs.blended,
            pH: llm!.probs1x2.home,
            pD: llm!.probs1x2.draw,
            pA: llm!.probs1x2.away,
            pOver25: llm!.pOver25,
            pUnder25: 1 - llm!.pOver25,
            pBtts: llm!.pBtts,
          }
        : probs.blended;

    const ctx: MatchContext = {
      match: { home: f.home, away: f.away, league: f.leagueCode as never, date: f.kickoffAt },
      pred,
      rawPred: probs.raw,
      odds1x2: features.odds1x2,
      oddsOU: features.oddsOU,
      oddsBtts: features.oddsBtts,
      ...features.forms,
    };
    const text = llm
      ? { en: `${llm.headlineEn}\n\n${llm.rationaleEn}`, am: `${llm.headlineAm}\n\n${llm.rationaleAm}` }
      : { en: `${f.home} vs ${f.away}: model pick (no written analysis).`, am: `${f.home} ከ ${f.away}: የሞዴል ምርጫ (የጽሑፍ ትንታኔ የለም)።` };

    for (const room of ROOMS) {
      if (probs.raw.homeWeight < room.minEvidence || probs.raw.awayWeight < room.minEvidence) continue;
      const c = room.select(ctx);
      if (!c) continue;
      if (!candidates.has(room.slug)) candidates.set(room.slug, []);
      candidates.get(room.slug)!.push({ fixtureId: f.id, analysisId: a.id, c, text });
    }
  }

  let written = 0;
  for (const room of ROOMS) {
    const roomId = roomIdBySlug.get(room.slug);
    if (!roomId) throw new Error(`Room ${room.slug} not seeded. Run: pnpm live:seed`);
    const picks = (candidates.get(room.slug) ?? []).sort((x, y) => y.c.score - x.c.score).slice(0, room.maxTipsPerDay);
    for (const p of picks) {
      const publishedAt = new Date();
      const hash = tipHash({
        room: room.slug,
        fixture: p.fixtureId,
        market: p.c.market,
        selection: p.c.selection,
        odds: p.c.odds,
        basis,
        publishedAt: publishedAt.toISOString(),
      });
      const res = await db
        .insert(schema.tips)
        .values({
          id: crypto.randomUUID(),
          roomId,
          fixtureId: p.fixtureId,
          analysisId: p.analysisId,
          market: p.c.market,
          selection: p.c.selection,
          basis,
          oddsAtPublish: p.c.odds.toFixed(3),
          modelProb: p.c.modelProb.toFixed(4),
          confidence: Math.min(5, Math.max(1, Math.round(p.c.modelProb * 5))),
          rationaleEn: p.text.en,
          rationaleAm: p.text.am,
          publishedAt,
          hash,
        })
        .onConflictDoNothing()
        .returning({ id: schema.tips.id });
      if (res.length > 0) {
        written++;
        console.log(`  [${basis}] ${room.slug}: ${p.c.market} ${p.c.selection} @ ${p.c.odds} (p=${p.c.modelProb.toFixed(2)}, ev=${p.c.ev.toFixed(3)})`);
      }
    }
  }
  console.log(`publish ${date} [${basis}]: ${written} new tips`);
  return written;
}

export async function tipsForFixtures(fixtureIds: string[]) {
  if (fixtureIds.length === 0) return [];
  return db.select().from(schema.tips).where(and(inArray(schema.tips.fixtureId, fixtureIds), eq(schema.tips.result, "pending")));
}
