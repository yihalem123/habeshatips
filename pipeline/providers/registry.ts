/**
 * Picks a provider for each role. Order matters: earlier = preferred. A provider is
 * skipped when it is not configured, has no budget left today/this month, or failed in
 * the last hour. "Alternation" falls out of this naturally: when the preferred source
 * is exhausted or down, the next one serves, and quotas are tracked per provider.
 */
import type { CompetitionCode } from "../data/api-football";
import { espn } from "./espn";
import { footballDataOrg } from "./football-data-org";
import { openLigaDb } from "./openligadb";
import { theOddsApi } from "./the-odds-api";
import type { Provider, ProviderName } from "./types";
import { usageFor } from "./usage";

export const PROVIDERS: Record<string, Provider> = { footballDataOrg, openLigaDb, theOddsApi, espn };

/** Preferred order per role. Override with env, e.g. FIXTURES_PROVIDERS=footballDataOrg,espn,openLigaDb */
const DEFAULT_ORDER: Record<"fixtures" | "results" | "standings" | "odds", ProviderName[]> = {
  fixtures: ["footballDataOrg", "espn", "openLigaDb"],
  results: ["footballDataOrg", "espn", "openLigaDb"],
  standings: ["footballDataOrg", "openLigaDb"],
  odds: ["theOddsApi", "espn"],
};

function order(role: keyof typeof DEFAULT_ORDER): ProviderName[] {
  const env = process.env[`${role.toUpperCase()}_PROVIDERS`];
  return env ? (env.split(",").map((s) => s.trim()) as ProviderName[]) : DEFAULT_ORDER[role];
}

export interface Pick {
  provider: Provider;
  reason: string;
}

export async function eligible(role: keyof typeof DEFAULT_ORDER, competition: CompetitionCode, credits = 0): Promise<Pick[]> {
  const out: Pick[] = [];
  for (const name of order(role)) {
    const p = PROVIDERS[name];
    if (!p) continue;
    const cap = role === "standings" ? p.standings : role === "odds" ? p.odds : p.fixtures;
    if (!cap) continue;
    if (!p.competitions.includes(competition)) continue;
    if (!p.available()) {
      out.push({ provider: p, reason: "not configured" });
      continue;
    }
    const u = await usageFor(name);
    if (p.budget.perDay !== null && u.requestsToday >= p.budget.perDay) {
      out.push({ provider: p, reason: `daily budget used (${u.requestsToday}/${p.budget.perDay})` });
      continue;
    }
    if (p.budget.creditsPerMonth !== null && u.creditsThisMonth + credits > p.budget.creditsPerMonth) {
      out.push({ provider: p, reason: `monthly credits used (${u.creditsThisMonth}/${p.budget.creditsPerMonth})` });
      continue;
    }
    if (u.lastErrorAt && Date.now() - u.lastErrorAt.getTime() < 3600_000) {
      out.push({ provider: p, reason: `recent error: ${u.lastError}` });
      continue;
    }
    out.push({ provider: p, reason: "ok" });
  }
  return out;
}

/**
 * Run `fn` against providers in preference order until one succeeds.
 * Returns the result and the provider that served it.
 */
export async function withProvider<T>(
  role: keyof typeof DEFAULT_ORDER,
  competition: CompetitionCode,
  fn: (p: Provider) => Promise<T>,
  opts: { credits?: number; accept?: (r: T) => boolean } = {},
): Promise<{ result: T; provider: ProviderName } | null> {
  const picks = await eligible(role, competition, opts.credits);
  const skipped: string[] = [];
  for (const { provider, reason } of picks) {
    if (reason !== "ok") {
      skipped.push(`${provider.name} (${reason})`);
      continue;
    }
    try {
      const result = await fn(provider);
      if (opts.accept && !opts.accept(result)) {
        skipped.push(`${provider.name} (empty)`);
        continue;
      }
      if (skipped.length) console.log(`  ${role} ${competition}: served by ${provider.name}; skipped ${skipped.join(", ")}`);
      return { result, provider: provider.name };
    } catch (err) {
      skipped.push(`${provider.name} (${(err as Error).message.slice(0, 80)})`);
    }
  }
  console.warn(`  ${role} ${competition}: no provider could serve; ${skipped.join(", ") || "none eligible"}`);
  return null;
}
