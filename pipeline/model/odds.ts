/** Odds helpers: implied probabilities with the bookmaker margin removed. */
import type { Odds1x2, OddsOU } from "../data/football-data";

export interface Implied1x2 {
  h: number;
  d: number;
  a: number;
  overround: number;
}

export function implied1x2(o: Odds1x2): Implied1x2 {
  const rh = 1 / o.h;
  const rd = 1 / o.d;
  const ra = 1 / o.a;
  const s = rh + rd + ra;
  return { h: rh / s, d: rd / s, a: ra / s, overround: s - 1 };
}

export function impliedOU(o: OddsOU): { over: number; under: number; overround: number } {
  const ro = 1 / o.over;
  const ru = 1 / o.under;
  const s = ro + ru;
  return { over: ro / s, under: ru / s, overround: s - 1 };
}
