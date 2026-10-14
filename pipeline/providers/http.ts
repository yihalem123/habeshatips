/** Shared fetch helper: disk cache, per-provider spacing, retry with backoff, usage accounting. */
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { recordUsage } from "./usage";
import type { ProviderName } from "./types";

const CACHE_ROOT = path.resolve(process.cwd(), "data/cache");
const MOCK_ROOT = path.resolve(process.cwd(), "pipeline/__fixtures__");
const lastAt = new Map<ProviderName, number>();
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export interface FetchOptions {
  provider: ProviderName;
  url: string;
  headers?: Record<string, string>;
  /** Minimum spacing between requests to this provider. */
  minIntervalMs?: number;
  /** Serve from disk cache when present (default true). */
  cache?: boolean;
  /** Credits this call costs on metered providers. */
  credits?: number;
  /** Called with response headers for providers that report quota. */
  onHeaders?: (h: Headers) => void;
  /** Mock file name under pipeline/__fixtures__/<provider>/ when MOCK is on. */
  mockKey?: string;
}

export function cacheKeyFor(url: string): string {
  const u = new URL(url);
  u.searchParams.delete("apiKey");
  u.searchParams.delete("token");
  const raw = u.toString();
  return `${u.pathname.replace(/[^a-z0-9]+/gi, "_").slice(0, 60)}_${crypto.createHash("sha1").update(raw).digest("hex").slice(0, 12)}.json`;
}

export async function fetchJson<T>(opts: FetchOptions): Promise<T> {
  const mock = process.env.PROVIDER_MOCK === "1" || process.env[`${opts.provider.toUpperCase()}_MOCK`] === "1";
  const key = cacheKeyFor(opts.url);
  if (mock) {
    const dir = path.join(MOCK_ROOT, opts.provider);
    for (const candidate of [opts.mockKey ? path.join(dir, opts.mockKey) : null, path.join(dir, key)]) {
      if (candidate && fs.existsSync(candidate)) return JSON.parse(fs.readFileSync(candidate, "utf8"));
    }
    throw new Error(`No mock for ${opts.provider} ${opts.url} (expected ${path.join(dir, opts.mockKey ?? key)})`);
  }

  const dir = path.join(CACHE_ROOT, opts.provider);
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, key);
  if (opts.cache !== false && fs.existsSync(file)) return JSON.parse(fs.readFileSync(file, "utf8"));

  for (let attempt = 0; attempt < 5; attempt++) {
    const wait = (lastAt.get(opts.provider) ?? 0) + (opts.minIntervalMs ?? 0) - Date.now();
    if (wait > 0) await sleep(wait);
    lastAt.set(opts.provider, Date.now());
    let res: Response;
    try {
      res = await fetch(opts.url, { headers: opts.headers, signal: AbortSignal.timeout(30_000) });
    } catch (err) {
      const backoff = 10_000 * (attempt + 1);
      console.warn(`${opts.provider}: network error (${(err as Error).message}); retry in ${backoff / 1000}s`);
      await sleep(backoff);
      continue;
    }
    await recordUsage(opts.provider, 1, opts.credits ?? 0);
    opts.onHeaders?.(res.headers);
    if (res.status === 429) {
      const backoff = 20_000 * (attempt + 1);
      console.warn(`${opts.provider}: rate limited; waiting ${backoff / 1000}s`);
      await sleep(backoff);
      continue;
    }
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      await recordUsage(opts.provider, 0, 0, `HTTP ${res.status} ${text.slice(0, 200)}`);
      throw new Error(`${opts.provider}: HTTP ${res.status} ${text.slice(0, 200)}`);
    }
    const body = (await res.json()) as T;
    fs.writeFileSync(file, JSON.stringify(body));
    return body;
  }
  throw new Error(`${opts.provider}: giving up after retries`);
}
