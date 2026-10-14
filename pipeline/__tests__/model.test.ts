import { describe, expect, it } from "vitest";
import { loadSeasons, parseSeasonCsv } from "../data/football-data";
import { fit, predict } from "../model/dixon-coles";
import { implied1x2 } from "../model/odds";
import { settle, profitUnits } from "../rooms/settle";

describe("football-data parser", () => {
  it("parses a row with opening, closing and O/U odds", () => {
    const csv =
      "Div,Date,HomeTeam,AwayTeam,FTHG,FTAG,FTR,B365H,B365D,B365A,B365CH,B365CD,B365CA,B365>2.5,B365<2.5,AvgH,AvgD,AvgA\n" +
      "E0,15/08/2025,Liverpool,Bournemouth,4,2,H,1.3,6,8.5,1.29,6.25,9,1.36,3.2,1.31,5.96,8.31\n" +
      "E0,16/08/2025,Unplayed,Team,,,,,,,,,,,,,,\n";
    const rows = parseSeasonCsv(csv, "E0", "2526");
    expect(rows).toHaveLength(1);
    expect(rows[0].result).toBe("H");
    expect(rows[0].odds.open).toEqual({ h: 1.3, d: 6, a: 8.5 });
    expect(rows[0].odds.close).toEqual({ h: 1.29, d: 6.25, a: 9 });
    expect(rows[0].odds.ou25).toEqual({ over: 1.36, under: 3.2 });
    expect(rows[0].date.toISOString().slice(0, 10)).toBe("2025-08-15");
  });
});

describe("dixon-coles", () => {
  const matches = loadSeasons(["E0"], ["2324", "2425"]);
  const model = fit(matches, { asOf: new Date("2025-06-01") });

  it("finds a positive home advantage on real data", () => {
    expect(model.home).toBeGreaterThan(0.1);
    expect(model.home).toBeLessThan(0.6);
  });

  it("produces probabilities that sum to one", () => {
    const p = predict(model, "Man City", "Everton");
    expect(p.pH + p.pD + p.pA).toBeCloseTo(1, 6);
    expect(p.pOver25 + p.pUnder25).toBeCloseTo(1, 6);
    expect(p.pH).toBeGreaterThan(p.pA);
  });

  it("rates a strong side above a weak one", () => {
    const city = model.teams.get("Man City")!;
    const sheff = model.teams.get("Sheffield United")!;
    expect(city.attack).toBeGreaterThan(sheff.attack);
    expect(city.defense).toBeLessThan(sheff.defense);
  });

  it("is roughly calibrated against the market on average", () => {
    let model1 = 0;
    let market1 = 0;
    let n = 0;
    const test = loadSeasons(["E0"], ["2526"]).filter((m) => m.odds.avg);
    for (const m of test.slice(0, 120)) {
      const p = predict(model, m.home, m.away);
      model1 += p.pH;
      market1 += implied1x2(m.odds.avg!).h;
      n++;
    }
    expect(Math.abs(model1 / n - market1 / n)).toBeLessThan(0.08);
  });
});

describe("settlement", () => {
  it("settles each market", () => {
    expect(settle({ market: "1X2", selection: "H" }, 2, 1)).toBe("win");
    expect(settle({ market: "1X2", selection: "D" }, 2, 1)).toBe("loss");
    expect(settle({ market: "OU25", selection: "O" }, 2, 1)).toBe("win");
    expect(settle({ market: "OU25", selection: "U" }, 1, 1)).toBe("win");
    expect(settle({ market: "BTTS", selection: "Y" }, 0, 3)).toBe("loss");
    expect(profitUnits("win", 2.5)).toBeCloseTo(1.5);
    expect(profitUnits("loss", 2.5)).toBe(-1);
  });
});
