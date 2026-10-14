/** Show, for a date, each analysis and what every room would pick (debug/ops). */
import "../env";
import { parseArgs } from "node:util";
import { closeDb } from "./db";
import { latestAnalyses } from "./latest";
import { fixturesOn } from "./analyze";
import { ROOMS, type MatchContext } from "../rooms/config";
import type { Prediction } from "../model/dixon-coles";

const { values } = parseArgs({ options: { date: { type: "string", default: new Date().toISOString().slice(0, 10) } } });

async function main() {
  const date = values.date!;
  const fixtures = await fixturesOn(date);
  const analyses = Array.from((await latestAnalyses(fixtures.map((f) => f.id))).values());
  for (const a of analyses) {
    const f = fixtures.find((x) => x.id === a.fixtureId)!;
    const probs = a.modelProbs as { raw: Prediction; blended: Prediction };
    const feat = a.features as { odds1x2: MatchContext["odds1x2"]; oddsOU: MatchContext["oddsOU"]; oddsBtts: MatchContext["oddsBtts"]; forms: Pick<MatchContext, "homeForm" | "awayForm" | "homeHomeForm" | "awayAwayForm"> };
    console.log(`\n${f.leagueCode} ${f.home} vs ${f.away}  odds ${JSON.stringify(feat.odds1x2)} ou ${JSON.stringify(feat.oddsOU)} btts ${JSON.stringify(feat.oddsBtts)}`);
    console.log(`  raw     H ${probs.raw.pH.toFixed(3)} D ${probs.raw.pD.toFixed(3)} A ${probs.raw.pA.toFixed(3)} O ${probs.raw.pOver25.toFixed(3)} xG ${probs.raw.lambda.toFixed(2)}+${probs.raw.mu.toFixed(2)} evidence ${probs.raw.homeWeight.toFixed(1)}/${probs.raw.awayWeight.toFixed(1)}`);
    console.log(`  blended H ${probs.blended.pH.toFixed(3)} D ${probs.blended.pD.toFixed(3)} A ${probs.blended.pA.toFixed(3)} O ${probs.blended.pOver25.toFixed(3)}`);
    console.log(`  form home ${feat.forms.homeHomeForm.ppg.toFixed(2)} ppg (home), away ${feat.forms.awayAwayForm.ppg.toFixed(2)} ppg (away)`);
    const ctx: MatchContext = {
      match: { home: f.home, away: f.away, league: f.leagueCode as never, date: f.kickoffAt },
      pred: probs.blended,
      rawPred: probs.raw,
      odds1x2: feat.odds1x2,
      oddsOU: feat.oddsOU,
      oddsBtts: feat.oddsBtts,
      ...feat.forms,
    };
    for (const room of ROOMS) {
      const evidenceOk = probs.raw.homeWeight >= room.minEvidence && probs.raw.awayWeight >= room.minEvidence;
      const c = evidenceOk ? room.select(ctx) : null;
      console.log(`  ${room.slug.padEnd(14)} ${!evidenceOk ? "insufficient evidence" : c ? `${c.market} ${c.selection} @ ${c.odds} p=${c.modelProb.toFixed(3)} edge=${c.edge.toFixed(3)} ev=${c.ev.toFixed(3)}` : "no pick"}`);
    }
  }
}
main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => closeDb());
