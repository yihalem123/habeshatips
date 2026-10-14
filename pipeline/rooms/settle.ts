import type { Candidate } from "./config";

export type Outcome = "win" | "loss" | "void";

export function settle(c: Pick<Candidate, "market" | "selection">, hg: number, ag: number): Outcome {
  const total = hg + ag;
  switch (c.market) {
    case "1X2": {
      const r = hg > ag ? "H" : hg < ag ? "A" : "D";
      return r === c.selection ? "win" : "loss";
    }
    case "OU25":
      return c.selection === "O" ? (total >= 3 ? "win" : "loss") : total <= 2 ? "win" : "loss";
    case "BTTS":
      return c.selection === "Y" ? (hg >= 1 && ag >= 1 ? "win" : "loss") : hg === 0 || ag === 0 ? "win" : "loss";
  }
}

/** Profit in flat 1-unit stakes. */
export function profitUnits(outcome: Outcome, odds: number): number {
  if (outcome === "void") return 0;
  return outcome === "win" ? odds - 1 : -1;
}
