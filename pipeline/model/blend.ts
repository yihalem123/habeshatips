/**
 * Blend model probabilities toward the bookmaker's (margin-removed) probabilities.
 * The market is a strong, well-calibrated forecaster; a pure Dixon-Coles model is not.
 * `w` is the weight on the market: 0 = pure model, 1 = pure market.
 */
import type { Odds1x2, OddsOU } from "../data/football-data";
import type { Prediction } from "./dixon-coles";
import { implied1x2, impliedOU } from "./odds";

export interface OddsBtts {
  yes: number;
  no: number;
}

export function blendPrediction(
  pred: Prediction,
  odds1x2: Odds1x2 | null,
  oddsOU: OddsOU | null,
  w: number,
  oddsBtts: OddsBtts | null = null,
): Prediction {
  const out = { ...pred };
  if (odds1x2 && w > 0) {
    const imp = implied1x2(odds1x2);
    out.pH = w * imp.h + (1 - w) * pred.pH;
    out.pD = w * imp.d + (1 - w) * pred.pD;
    out.pA = w * imp.a + (1 - w) * pred.pA;
  }
  if (oddsOU && w > 0) {
    const imp = impliedOU(oddsOU);
    out.pOver25 = w * imp.over + (1 - w) * pred.pOver25;
    out.pUnder25 = 1 - out.pOver25;
  }
  if (oddsBtts && w > 0) {
    const ry = 1 / oddsBtts.yes;
    const rn = 1 / oddsBtts.no;
    out.pBtts = w * (ry / (ry + rn)) + (1 - w) * pred.pBtts;
  }
  return out;
}
