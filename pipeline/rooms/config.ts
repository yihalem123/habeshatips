/**
 * Tipping rooms. Each room is a deterministic filter over the daily model output.
 * The persona only shapes how the rationale is written; it never changes the pick.
 */
import type { Match } from "../data/football-data";
import type { Prediction } from "../model/dixon-coles";
import type { FormSummary } from "../data/form";
import { implied1x2, impliedOU } from "../model/odds";

export type Market = "1X2" | "OU25" | "BTTS";
export type Selection = "H" | "D" | "A" | "O" | "U" | "Y" | "N";

export interface Candidate {
  market: Market;
  selection: Selection;
  odds: number;
  /** Decision probability: model blended toward the market (see pipeline/model/blend.ts). */
  modelProb: number;
  /** Raw Dixon-Coles probability before blending. */
  rawProb: number;
  impliedProb: number;
  /** modelProb - impliedProb (margin removed) */
  edge: number;
  /** Expected value per unit at the quoted odds: modelProb * odds - 1 */
  ev: number;
  /** Rooms rank their candidates by this; higher is better. */
  score: number;
}

export interface MatchContext {
  match: Pick<Match, "home" | "away" | "league" | "date">;
  /** Blended prediction used for decisions. */
  pred: Prediction;
  /** Raw model prediction, for reference and for the written rationale. */
  rawPred: Prediction;
  odds1x2: { h: number; d: number; a: number } | null;
  oddsOU: { over: number; under: number } | null;
  /** Both-teams-to-score odds when available (live feed only; backtests pass null). */
  oddsBtts: { yes: number; no: number } | null;
  homeHomeForm: FormSummary;
  awayAwayForm: FormSummary;
  homeForm: FormSummary;
  awayForm: FormSummary;
}

export interface Room {
  slug: string;
  nameEn: string;
  nameAm: string;
  persona: string;
  /** One-line tag shown on cards. */
  tag: string;
  markets: Market[];
  maxTipsPerDay: number;
  /** Minimum decay-weighted evidence on both teams before the room will tip a match. */
  minEvidence: number;
  /** Human-readable rules, shown on the room page. Keep in sync with select(). */
  rules: { label: string; value: string }[];
  select(ctx: MatchContext): Candidate | null;
}

function cand1x2(ctx: MatchContext, sel: "H" | "D" | "A"): Candidate | null {
  if (!ctx.odds1x2) return null;
  const imp = implied1x2(ctx.odds1x2);
  const odds = sel === "H" ? ctx.odds1x2.h : sel === "D" ? ctx.odds1x2.d : ctx.odds1x2.a;
  const modelProb = sel === "H" ? ctx.pred.pH : sel === "D" ? ctx.pred.pD : ctx.pred.pA;
  const impliedProb = sel === "H" ? imp.h : sel === "D" ? imp.d : imp.a;
  const rawProb = sel === "H" ? ctx.rawPred.pH : sel === "D" ? ctx.rawPred.pD : ctx.rawPred.pA;
  const edge = modelProb - impliedProb;
  const ev = modelProb * odds - 1;
  return { market: "1X2", selection: sel, odds, modelProb, rawProb, impliedProb, edge, ev, score: ev };
}

function candOU(ctx: MatchContext, sel: "O" | "U"): Candidate | null {
  if (!ctx.oddsOU) return null;
  const imp = impliedOU(ctx.oddsOU);
  const odds = sel === "O" ? ctx.oddsOU.over : ctx.oddsOU.under;
  const modelProb = sel === "O" ? ctx.pred.pOver25 : ctx.pred.pUnder25;
  const impliedProb = sel === "O" ? imp.over : imp.under;
  const rawProb = sel === "O" ? ctx.rawPred.pOver25 : ctx.rawPred.pUnder25;
  const edge = modelProb - impliedProb;
  const ev = modelProb * odds - 1;
  return { market: "OU25", selection: sel, odds, modelProb, rawProb, impliedProb, edge, ev, score: ev };
}

function candBtts(ctx: MatchContext, sel: "Y" | "N"): Candidate | null {
  if (!ctx.oddsBtts) return null;
  const ry = 1 / ctx.oddsBtts.yes;
  const rn = 1 / ctx.oddsBtts.no;
  const impliedProb = sel === "Y" ? ry / (ry + rn) : rn / (ry + rn);
  const odds = sel === "Y" ? ctx.oddsBtts.yes : ctx.oddsBtts.no;
  const modelProb = sel === "Y" ? ctx.pred.pBtts : 1 - ctx.pred.pBtts;
  const rawProb = sel === "Y" ? ctx.rawPred.pBtts : 1 - ctx.rawPred.pBtts;
  const edge = modelProb - impliedProb;
  const ev = modelProb * odds - 1;
  return { market: "BTTS", selection: sel, odds, modelProb, rawProb, impliedProb, edge, ev, score: ev };
}

function best(...cands: (Candidate | null)[]): Candidate | null {
  const ok = cands.filter((c): c is Candidate => !!c);
  if (ok.length === 0) return null;
  return ok.sort((x, y) => y.score - x.score)[0];
}

export const ROOMS: Room[] = [
  {
    slug: "safe-bet",
    nameEn: "Safe Bet",
    nameAm: "አስተማማኝ ምርጫ",
    persona: "Calm, conservative, favors clear favorites and skips coin-flips.",
    tag: "Clear favorites only. Many days it says nothing.",
    rules: [{ label: "Model probability", value: "≥ 62%" }, { label: "Odds range", value: "1.25 – 1.65" }, { label: "Edge vs market", value: "≥ −3 pts" }, { label: "Evidence per team", value: "≥ 8 matches" }],
    markets: ["1X2"],
    maxTipsPerDay: 3,
    minEvidence: 8,
    select(ctx) {
      const sel = ctx.pred.pH >= ctx.pred.pA ? "H" : "A";
      const c = cand1x2(ctx, sel);
      if (!c) return null;
      if (c.modelProb < 0.62 || c.odds < 1.25 || c.odds > 1.65) return null;
      if (c.edge < -0.03) return null; // never tip a favorite the market likes far more than we do
      return { ...c, score: c.modelProb };
    },
  },
  {
    slug: "value-hunter",
    nameEn: "Value Hunter",
    nameAm: "ዋጋ አዳኝ",
    persona: "Analytical contrarian; only bets where the price is wrong.",
    tag: "Only bets where the price is wrong.",
    rules: [{ label: "Expected value", value: "≥ +5%" }, { label: "Odds range", value: "1.80 – 3.60" }, { label: "Evidence per team", value: "≥ 10 matches" }],
    markets: ["1X2"],
    maxTipsPerDay: 3,
    minEvidence: 10,
    select(ctx) {
      const cands = (["H", "D", "A"] as const)
        .map((s) => cand1x2(ctx, s))
        .filter((c): c is Candidate => !!c && c.ev >= 0.05 && c.odds >= 1.8 && c.odds <= 3.6);
      if (cands.length === 0) return null;
      return cands.sort((x, y) => y.ev - x.ev)[0];
    },
  },
  {
    slug: "goal-rush",
    nameEn: "Goal Rush",
    nameAm: "የጎል ዝናብ",
    persona: "Loves open games; looks for two attacking sides and leaky defenses.",
    tag: "Open games, both sides scoring.",
    rules: [{ label: "Expected goals", value: "≥ 2.9" }, { label: "Over 2.5 probability", value: "≥ 58%" }, { label: "BTTS probability", value: "≥ 60%" }, { label: "Edge vs market", value: "≥ +2 pts" }, { label: "Evidence per team", value: "≥ 8 matches" }],
    markets: ["OU25", "BTTS"],
    maxTipsPerDay: 3,
    minEvidence: 8,
    select(ctx) {
      const xg = ctx.pred.lambda + ctx.pred.mu;
      if (xg < 2.9) return null;
      const o = candOU(ctx, "O");
      const over = o && o.modelProb >= 0.58 && o.edge >= 0.02 ? { ...o, score: o.edge + (xg - 2.9) * 0.05 } : null;
      const b = candBtts(ctx, "Y");
      const btts = b && b.modelProb >= 0.6 && b.edge >= 0.02 ? { ...b, score: b.edge } : null;
      return best(over, btts);
    },
  },
  {
    slug: "lockdown",
    nameEn: "Lockdown",
    nameAm: "ቁልፍ መከላከያ",
    persona: "Patient and defensive; backs tight, low-scoring matches.",
    tag: "Tight, low-scoring matches.",
    rules: [{ label: "Expected goals", value: "≤ 2.35" }, { label: "Under 2.5 probability", value: "≥ 56%" }, { label: "BTTS-no probability", value: "≥ 58%" }, { label: "Edge vs market", value: "≥ +2 pts" }, { label: "Evidence per team", value: "≥ 8 matches" }],
    markets: ["OU25", "BTTS"],
    maxTipsPerDay: 3,
    minEvidence: 8,
    select(ctx) {
      const xg = ctx.pred.lambda + ctx.pred.mu;
      if (xg > 2.35) return null;
      const u = candOU(ctx, "U");
      const under = u && u.modelProb >= 0.56 && u.edge >= 0.02 ? { ...u, score: u.edge + (2.35 - xg) * 0.05 } : null;
      const b = candBtts(ctx, "N");
      const btts = b && b.modelProb >= 0.58 && b.edge >= 0.02 ? { ...b, score: b.edge } : null;
      return best(under, btts);
    },
  },
  {
    slug: "home-fortress",
    nameEn: "Home Fortress",
    nameAm: "የቤት ምሽግ",
    persona: "Backs strong home sides in good home form against travel-sick visitors.",
    tag: "Strong home sides against poor travellers.",
    rules: [{ label: "Home win probability", value: "≥ 52%" }, { label: "Odds range", value: "1.35 – 2.20" }, { label: "Home form (last 5 home)", value: "≥ 1.8 ppg" }, { label: "Away form (last 5 away)", value: "≤ 1.6 ppg" }, { label: "Evidence per team", value: "≥ 8 matches" }],
    markets: ["1X2"],
    maxTipsPerDay: 3,
    minEvidence: 8,
    select(ctx) {
      const c = cand1x2(ctx, "H");
      if (!c) return null;
      if (c.modelProb < 0.52 || c.odds < 1.35 || c.odds > 2.2) return null;
      if (ctx.homeHomeForm.played < 3 || ctx.homeHomeForm.ppg < 1.8) return null;
      if (ctx.awayAwayForm.played >= 3 && ctx.awayAwayForm.ppg > 1.6) return null;
      if (c.edge < -0.02) return null;
      return { ...c, score: c.modelProb + ctx.homeHomeForm.ppg * 0.05 };
    },
  },
  {
    slug: "draw-master",
    nameEn: "Draw Master",
    nameAm: "የአቻ ጌታ",
    persona: "Specialist in stalemates: evenly matched, cautious teams.",
    tag: "Evenly matched, cautious teams.",
    rules: [{ label: "Draw probability", value: "≥ 30%" }, { label: "Draw odds", value: "≥ 3.00" }, { label: "Edge vs market", value: "≥ +2 pts" }, { label: "Balance |P(home) − P(away)|", value: "≤ 0.20" }, { label: "Evidence per team", value: "≥ 10 matches" }],
    markets: ["1X2"],
    maxTipsPerDay: 2,
    minEvidence: 10,
    select(ctx) {
      const c = cand1x2(ctx, "D");
      if (!c) return null;
      if (c.modelProb < 0.30 || c.odds < 3.0 || c.edge < 0.02) return null;
      const balance = Math.abs(ctx.pred.pH - ctx.pred.pA);
      if (balance > 0.2) return null;
      return { ...c, score: c.edge + (0.2 - balance) * 0.1 };
    },
  },
];

export const ROOM_BY_SLUG = new Map(ROOMS.map((r) => [r.slug, r]));
