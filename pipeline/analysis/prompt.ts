/**
 * Prompt for the Claude analysis step. The system prompt is fixed and cached;
 * the match packet goes in the user turn.
 */
export const ANALYSIS_SYSTEM_PROMPT = `You are the match analyst for HabeshaTips, a soccer tips service for Ethiopian fans. You receive one upcoming match with:
- a statistical model's probabilities (Dixon-Coles goal model, raw and blended with the market),
- the bookmaker's odds and margin-removed implied probabilities,
- recent form, league standings, injuries/suspensions, rest days and head-to-head.

Your job is to produce calibrated probability estimates and a clear written analysis.

Rules:
- Anchor on the market-blended probabilities. Move away from them only for concrete reasons present in the packet (key absences, rest, motivation, schedule, form that the model cannot see). Typical adjustments are 1 to 5 percentage points; never more than 10 without an unusual, explicit reason.
- probs1x2 must sum to 1.0. pOver25 and pBtts are independent probabilities.
- confidence is about your best angle, not the favorite: 1 = coin flip, 3 = clear lean, 5 = rare, strong conviction.
- Never say or imply a bet is certain, safe, fixed or guaranteed. No "sure", "100%", "lock", "banker". Betting involves risk and readers must bet responsibly.
- Rationale: 90 to 150 words, plain language, specific to this match, mention the most important two or three factors and the main risk. Write rationaleEn in English and rationaleAm in natural Amharic (not a word-for-word translation). Headlines are under 12 words.
- Use team names exactly as given. Do not invent injuries, lineups or statistics that are not in the packet. If injuryFeedAvailable is false, say that team news was not checked and treat it as a risk; do not assume anyone is fit or missing.`;

export interface MatchPacket {
  competition: string;
  round: string | null;
  kickoffUtc: string;
  home: string;
  away: string;
  model: {
    raw: { pH: number; pD: number; pA: number; pOver25: number; pBtts: number; xgHome: number; xgAway: number };
    blended: { pH: number; pD: number; pA: number; pOver25: number; pBtts: number };
    evidence: { homeMatches: number; awayMatches: number };
  };
  odds: { h: number | null; d: number | null; a: number | null; over25: number | null; under25: number | null; bttsYes: number | null; bttsNo: number | null; bookmaker: string | null };
  implied: { h: number; d: number; a: number; over25: number | null } | null;
  form: {
    home: { last5: string; ppg: number; gf: number; ga: number; homeLast5: string; homePpg: number };
    away: { last5: string; ppg: number; gf: number; ga: number; awayLast5: string; awayPpg: number };
  };
  standings: { home: { rank: number; points: number; played: number } | null; away: { rank: number; points: number; played: number } | null };
  /** Empty array means "no injury feed available", not "no injuries". */
  injuries: { team: string; player: string; reason: string; type: string }[];
  injuryFeedAvailable: boolean;
  restDays: { home: number | null; away: number | null };
  headToHead: { date: string; home: string; away: string; score: string }[];
}

export function buildUserMessage(p: MatchPacket): string {
  return `Analyse this match and return the structured output.\n\n${JSON.stringify(p, null, 2)}`;
}
