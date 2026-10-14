import { Prose } from "@/components/prose";

export const metadata = { title: "Responsible gambling" };

export default function ResponsibleGambling() {
  return (
    <Prose title="Responsible gambling">
      <p>You must be 18 or older to use this service. Betting is entertainment with a cost, not a way to earn money.</p>
      <ul>
        <li>Decide a monthly amount you can lose without it affecting rent, food or family, and never exceed it.</li>
        <li>Flat stakes only. Chasing losses with bigger bets is how a bad week becomes a bad year.</li>
        <li>Losing streaks of five or more happen to every strategy on this site, including the best ones. The leaderboard shows them.</li>
        <li>If betting stops being fun, stop. Talk to someone you trust.</li>
      </ul>
      <p>Tips here are information. No pick is certain, safe or guaranteed, and nobody at HabeshaTips will ever tell you otherwise.</p>
    </Prose>
  );
}

// Personalised per request (locale cookie, session): allowed to block instead of prerendering.
export const instant = false;
