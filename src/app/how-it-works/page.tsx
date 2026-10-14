import { IconBrain, IconData, IconHash, IconLayers, IconShield } from "@/components/icons";
import { Prose } from "@/components/prose";
import { Eyebrow } from "@/components/ui";
import { getLocale, t } from "@/lib/i18n";

export const metadata = { title: "How it works" };

const STEPS = [
  { icon: <IconData />, title: "Data", body: "Every morning the pipeline pulls fixtures, results, standings and bookmaker odds for the Premier League, La Liga, Serie A, Bundesliga, Ligue 1 and the Champions League from several free sources, cross-checked by canonical team names." },
  { icon: <IconBrain />, title: "Model", body: "A Dixon-Coles goal model, refitted daily on two seasons of results with time decay, produces win, draw, loss, over/under and both-teams-to-score probabilities. These are blended 80/20 with the bookmaker's margin-removed prices, because the market is a stronger forecaster than any public-data model." },
  { icon: <IconLayers />, title: "Analysis", body: "Claude reads the match packet (model output, odds, form, rest days, head-to-head, standings) and writes the rationale in English and Amharic. It is told what it does not know, for example when team news is unavailable." },
  { icon: <IconHash />, title: "Rooms", body: "Each room applies its rules: minimum probability, odds range, expected value, evidence on both teams, and a daily cap. Many days a room publishes nothing. That is the strategy working, not failing." },
  { icon: <IconShield />, title: "Publish, hash, settle", body: "A tip is written with the odds at that moment, a UTC timestamp and a SHA-256 hash. After full time it is settled at those odds with a flat one-unit stake. The leaderboard is arithmetic over that record and nothing else." },
];

export default async function HowItWorks() {
  const locale = await getLocale();
  return (
    <Prose
      title={t(locale, "howItWorks")}
      aside={
        <div className="space-y-4">
          <div>
            <Eyebrow>{t(locale, "onThisPage")}</Eyebrow>
            <ol className="mt-2 space-y-1.5 text-[13px]">
              {STEPS.map((s, i) => (
                <li key={s.title}>
                  <a href={`#step-${i + 1}`} className="flex gap-2 font-semibold text-ink-2 hover:text-ink">
                    <span className="num text-muted">{String(i + 1).padStart(2, "0")}</span> {s.title}
                  </a>
                </li>
              ))}
              <li>
                <a href="#numbers" className="flex gap-2 font-semibold text-ink-2 hover:text-ink">
                  <span className="num text-muted">06</span> What the numbers mean
                </a>
              </li>
            </ol>
          </div>
          <form action="/search" className="card p-4">
            <div className="text-[13px] font-extrabold">{t(locale, "checkTip")}</div>
            <p className="mt-1 text-[12px] text-muted">{t(locale, "checkTipSub")}</p>
            <input name="q" placeholder="9f2c1b7e…" className="num mt-3 h-9 w-full rounded-lg border border-white/10 bg-bg-2 px-3 text-[12px] outline-none placeholder:text-muted focus:border-green" />
          </form>
        </div>
      }
    >
      <p>HabeshaTips publishes soccer tips from six rooms. Each room is a fixed strategy, not a person. All six read the same daily analysis and apply different rules to it.</p>
      <div className="not-prose mt-6 space-y-3">
        {STEPS.map((s, i) => (
          <div key={s.title} id={`step-${i + 1}`} className="card flex gap-4 p-5">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[11px] bg-surface-3 text-green">{s.icon}</span>
            <div>
              <div className="num text-[11px] text-muted">{String(i + 1).padStart(2, "0")}</div>
              <h2 className="!mt-0 text-[17px] font-extrabold text-ink">{s.title}</h2>
              <p className="mt-1.5 text-[14px] leading-relaxed text-ink-2">{s.body}</p>
            </div>
          </div>
        ))}
        <div id="numbers" className="card p-5">
          <div className="num text-[11px] text-muted">06</div>
          <h2 className="!mt-0 text-[17px] font-extrabold text-ink">What the numbers mean</h2>
          <p className="mt-1.5 text-[14px] leading-relaxed text-ink-2">ROI is profit divided by the number of tips. Over a season a disciplined strategy on public data usually lands between −5% and +5%. Anyone promising more is not showing you a verified record.</p>
        </div>
      </div>
    </Prose>
  );
}

// Personalised per request (locale cookie, session): allowed to block instead of prerendering.
export const instant = false;
