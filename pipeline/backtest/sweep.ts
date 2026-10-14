/**
 * Parameter sweep: decay xi × market blend w, for one season.
 * Usage: tsx pipeline/backtest/sweep.ts --season 2526 [--history 2]
 */
import { parseArgs } from "node:util";
import { LEAGUE_CODES } from "../data/football-data";
import { runBacktest } from "./run";

const { values } = parseArgs({
  options: {
    season: { type: "string", default: "2526" },
    history: { type: "string", default: "2" },
    odds: { type: "string", default: "open" },
  },
});

const XIS = [0.001, 0.002, 0.004];
const WS = [0, 0.5, 0.8];

const rows: string[] = [];
rows.push(`season=${values.season} odds=${values.odds}`);
rows.push("xi | w | model LL | market LL | " + "safe-bet | value-hunter | goal-rush | lockdown | home-fortress | draw-master");
for (const xi of XIS) {
  for (const w of WS) {
    const r = runBacktest({
      season: values.season!,
      leagues: LEAGUE_CODES,
      oddsSource: values.odds as "open" | "close" | "max",
      xi,
      historySeasons: Number(values.history),
      blend: w,
    });
    const cells = r.stats.map((s) => `${s.tips}t ${(s.roi * 100).toFixed(1)}%`);
    rows.push(`${xi} | ${w} | ${r.model.logLoss.toFixed(4)} | ${r.model.marketLogLoss.toFixed(4)} | ${cells.join(" | ")}`);
    console.log(rows[rows.length - 1]);
  }
}
console.log("\n" + rows.join("\n"));
