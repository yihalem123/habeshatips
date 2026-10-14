import { describe, expect, it } from "vitest";
import { normalizeOdds, seasonForDate, type AfOdds } from "../data/api-football";
import { tipHash } from "../live/publish";
import { blendPrediction } from "../model/blend";

describe("api-football helpers", () => {
  it("normalises Bet365 odds into 1X2, O/U 2.5 and BTTS", () => {
    const odds: AfOdds[] = [
      {
        fixture: { id: 1 },
        bookmakers: [
          {
            id: 8,
            name: "Bet365",
            bets: [
              { id: 1, name: "Match Winner", values: [{ value: "Home", odd: "1.50" }, { value: "Draw", odd: "4.50" }, { value: "Away", odd: "6.50" }] },
              { id: 5, name: "Goals Over/Under", values: [{ value: "Over 1.5", odd: "1.20" }, { value: "Over 2.5", odd: "1.57" }, { value: "Under 2.5", odd: "2.37" }] },
              { id: 8, name: "Both Teams Score", values: [{ value: "Yes", odd: "1.80" }, { value: "No", odd: "2.00" }] },
            ],
          },
        ],
      },
    ];
    expect(normalizeOdds(odds)).toEqual({ h: 1.5, d: 4.5, a: 6.5, over25: 1.57, under25: 2.37, bttsYes: 1.8, bttsNo: 2, bookmaker: "Bet365" });
    expect(normalizeOdds([]).h).toBeNull();
  });

  it("maps dates to the season start year", () => {
    expect(seasonForDate(new Date("2026-10-17"))).toBe(2026);
    expect(seasonForDate(new Date("2027-03-01"))).toBe(2026);
    expect(seasonForDate(new Date("2027-08-15"))).toBe(2027);
  });
});

describe("publishing", () => {
  it("hashes deterministically regardless of key order", () => {
    const a = tipHash({ room: "safe-bet", fixture: "af-1", market: "1X2", selection: "H", odds: 1.5, basis: "model", publishedAt: "t" });
    const b = tipHash({ publishedAt: "t", basis: "model", odds: 1.5, selection: "H", market: "1X2", fixture: "af-1", room: "safe-bet" });
    expect(a).toBe(b);
    expect(a).toHaveLength(64);
    expect(tipHash({ room: "safe-bet", fixture: "af-2" })).not.toBe(a);
  });

  it("blends every market toward the bookmaker", () => {
    const raw = { lambda: 1, mu: 1, pH: 0.5, pD: 0.3, pA: 0.2, pOver25: 0.3, pUnder25: 0.7, pBtts: 0.3, homeWeight: 10, awayWeight: 10 };
    const out = blendPrediction(raw, { h: 2, d: 2, a: 2 }, { over: 2, under: 2 }, 0.5, { yes: 2, no: 2 });
    expect(out.pH).toBeCloseTo(0.4167, 3);
    expect(out.pOver25).toBeCloseTo(0.4, 6);
    expect(out.pBtts).toBeCloseTo(0.4, 6);
    expect(out.pUnder25).toBeCloseTo(0.6, 6);
  });
});
