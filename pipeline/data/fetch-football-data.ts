/**
 * Download season CSVs from football-data.co.uk into data/football-data/.
 * Usage: pnpm fetch:fd [--from 2324] [--to 2627]
 */
import fs from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";
import { DATA_DIR, LEAGUE_CODES, seasonRange } from "./football-data";

const { values } = parseArgs({
  options: {
    from: { type: "string", default: "2324" },
    to: { type: "string", default: "2627" },
  },
});

async function main() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  for (const season of seasonRange(values.from!, values.to!)) {
    for (const league of LEAGUE_CODES) {
      const url = `https://www.football-data.co.uk/mmz4281/${season}/${league}.csv`;
      const dest = path.join(DATA_DIR, `${league}_${season}.csv`);
      const res = await fetch(url);
      if (!res.ok) {
        console.warn(`skip ${league} ${season}: HTTP ${res.status}`);
        continue;
      }
      const text = await res.text();
      fs.writeFileSync(dest, text);
      console.log(`${league} ${season}: ${text.split("\n").length - 1} rows`);
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
