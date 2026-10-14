/** Request/credit accounting per provider, persisted in Postgres (provider_usage). */
import { and, eq, sql } from "drizzle-orm";
import { db, schema } from "../live/db";
import type { ProviderName } from "./types";

const dayKey = (d = new Date()) => d.toISOString().slice(0, 10);
const monthKey = (d = new Date()) => d.toISOString().slice(0, 7);

export async function recordUsage(provider: ProviderName, requests: number, credits: number, error?: string) {
  for (const period of [dayKey(), monthKey()]) {
    await db
      .insert(schema.providerUsage)
      .values({
        id: `${provider}:${period}`,
        provider,
        period,
        requests,
        credits,
        lastError: error ?? null,
        lastErrorAt: error ? new Date() : null,
      })
      .onConflictDoUpdate({
        target: [schema.providerUsage.provider, schema.providerUsage.period],
        set: {
          requests: sql`${schema.providerUsage.requests} + ${requests}`,
          credits: sql`${schema.providerUsage.credits} + ${credits}`,
          ...(error ? { lastError: error, lastErrorAt: new Date() } : {}),
          updatedAt: new Date(),
        },
      });
  }
}

export interface UsageSnapshot {
  requestsToday: number;
  creditsThisMonth: number;
  lastError: string | null;
  lastErrorAt: Date | null;
}

export async function usageFor(provider: ProviderName): Promise<UsageSnapshot> {
  const [day] = await db
    .select()
    .from(schema.providerUsage)
    .where(and(eq(schema.providerUsage.provider, provider), eq(schema.providerUsage.period, dayKey())));
  const [month] = await db
    .select()
    .from(schema.providerUsage)
    .where(and(eq(schema.providerUsage.provider, provider), eq(schema.providerUsage.period, monthKey())));
  return {
    requestsToday: day?.requests ?? 0,
    creditsThisMonth: month?.credits ?? 0,
    lastError: day?.lastError ?? null,
    lastErrorAt: day?.lastErrorAt ?? null,
  };
}
