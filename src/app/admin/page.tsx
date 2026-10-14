import { redirect } from "next/navigation";
import { desc, sql } from "drizzle-orm";
import { db } from "@/db";
import { matchAnalyses, providerUsage, tips, fixtures, subscriptions, users } from "@/db/schema";
import { fmtDateTimeIso } from "@/lib/format";
import { getCurrentUser } from "@/lib/session";

export const metadata = { title: "Admin" };

export default async function Admin() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/admin");
  if (!user.isAdmin) redirect("/dashboard");

  const [counts] = await db.execute(sql`
    select
      (select count(*) from ${users}) as users,
      (select count(*) from ${subscriptions} where status = 'active' and ends_at > now()) as active_subs,
      (select count(*) from ${tips} where is_backtest = false) as live_tips,
      (select count(*) from ${tips} where is_backtest = false and result = 'pending') as pending_tips,
      (select count(*) from ${fixtures} where kickoff_at::date = current_date) as fixtures_today,
      (select count(*) from ${matchAnalyses} where run_at::date = current_date) as analyses_today
  `);
  const usage = await db.select().from(providerUsage).orderBy(desc(providerUsage.period), providerUsage.provider).limit(20);
  const recentAnalyses = await db.select().from(matchAnalyses).orderBy(desc(matchAnalyses.runAt)).limit(10);
  const row = counts as Record<string, string>;

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <h1 className="text-[28px] font-extrabold tracking-tight">Admin</h1>
      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {Object.entries(row).map(([k, v]) => (
          <div key={k} className="card p-4">
            <div className="text-[11px] uppercase tracking-[0.14em] text-muted">{k.replace("_", " ")}</div>
            <div className="num mt-1 text-2xl">{v}</div>
          </div>
        ))}
      </div>
      <h2 className="mt-10 text-[18px] font-extrabold">Provider usage</h2>
      <table className="num mt-3 w-full text-sm">
        <tbody>
          {usage.map((u) => (
            <tr key={u.id} className="border-t border-line">
              <td className="py-2 text-ink-2">{u.period}</td>
              <td className="py-2">{u.provider}</td>
              <td className="py-2 text-right">{u.requests} req</td>
              <td className="py-2 text-right">{u.credits} cr</td>
              <td className="py-2 text-right text-red">{u.lastError ?? ""}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <h2 className="mt-10 text-[18px] font-extrabold">Recent analyses</h2>
      <table className="num mt-3 w-full text-sm">
        <tbody>
          {recentAnalyses.map((a) => (
            <tr key={a.id} className="border-t border-line">
              <td className="py-2 text-ink-2">{fmtDateTimeIso(a.runAt)}</td>
              <td className="py-2">{a.fixtureId}</td>
              <td className="py-2 text-right">{a.llmModel ?? "no LLM"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Personalised per request (locale cookie, session): allowed to block instead of prerendering.
export const instant = false;
