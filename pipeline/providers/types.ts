/**
 * Provider abstraction. Each data role (fixtures, results, standings, odds) can be served
 * by several providers; the registry picks one per call based on priority, remaining
 * quota and recent health, so free tiers can be alternated and combined.
 */
import type { CompetitionCode } from "../data/api-football";

export type ProviderName = "footballDataOrg" | "openLigaDb" | "theOddsApi" | "espn" | "apiFootball" | "footballDataCsv";

export type FixtureStatus = "scheduled" | "live" | "finished" | "postponed" | "cancelled";

export interface ProviderFixture {
  provider: ProviderName;
  externalId: string;
  competition: CompetitionCode;
  season: number;
  kickoffUtc: Date;
  /** Team names as the provider spells them; canonicalised by the registry. */
  homeRaw: string;
  awayRaw: string;
  status: FixtureStatus;
  homeGoals: number | null;
  awayGoals: number | null;
  round: string | null;
}

export interface ProviderStanding {
  teamRaw: string;
  rank: number;
  points: number;
  played: number;
  goalsFor: number;
  goalsAgainst: number;
}

export interface ProviderOdds {
  provider: ProviderName;
  externalId: string | null;
  competition: CompetitionCode;
  kickoffUtc: Date;
  homeRaw: string;
  awayRaw: string;
  bookmaker: string;
  h: number | null;
  d: number | null;
  a: number | null;
  over25: number | null;
  under25: number | null;
  bttsYes: number | null;
  bttsNo: number | null;
}

export interface Budget {
  /** Max requests per UTC day (null = unlimited). */
  perDay: number | null;
  /** Max requests per minute (used for spacing). */
  perMinute: number | null;
  /** Max metered credits per calendar month (The Odds API). */
  creditsPerMonth: number | null;
}

export interface FixturesCapability {
  /** Fixtures for a competition season, optionally restricted to a UTC date range. */
  fixtures(competition: CompetitionCode, season: number, range?: { from: string; to: string }): Promise<ProviderFixture[]>;
}

export interface StandingsCapability {
  standings(competition: CompetitionCode, season: number): Promise<ProviderStanding[]>;
}

export interface OddsCapability {
  /** Pre-match odds for upcoming fixtures in a competition. */
  odds(competition: CompetitionCode): Promise<ProviderOdds[]>;
}

export interface Provider {
  name: ProviderName;
  /** Competitions this provider can serve at all. */
  competitions: CompetitionCode[];
  budget: Budget;
  /** True when the provider is configured (key present) or needs no key. */
  available(): boolean;
  fixtures?: FixturesCapability["fixtures"];
  standings?: StandingsCapability["standings"];
  odds?: OddsCapability["odds"];
}
