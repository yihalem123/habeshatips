/**
 * Dixon-Coles goal model with exponential time decay.
 *
 * Home goals ~ Poisson(lambda), lambda = exp(attack_home + defense_away + home)
 * Away goals ~ Poisson(mu),     mu     = exp(attack_away + defense_home)
 * with the Dixon-Coles low-score correction tau(x, y; lambda, mu, rho).
 *
 * Attack/defense/home are fitted by weighted iterative scaling (fixed-point
 * updates of the Poisson MLE), with a small pseudo-count prior that shrinks
 * teams with little history toward league average. rho is then chosen by a
 * 1-D grid search on the full Dixon-Coles likelihood.
 */
import type { Match } from "../data/football-data";

export interface TeamRating {
  attack: number;
  defense: number;
  /** Sum of decay weights behind this estimate; small = little evidence. */
  weight: number;
}

export interface Model {
  teams: Map<string, TeamRating>;
  home: number;
  rho: number;
  /** Decay weight sum across the training set. */
  totalWeight: number;
  asOf: Date;
}

export interface FitOptions {
  /** Fit as of this date: matches on or after it are ignored. */
  asOf: Date;
  /** Decay rate per day. 0.002 ≈ half-life of ~350 days. */
  xi?: number;
  iterations?: number;
  /** Pseudo-matches at league-average scoring pulling thin teams to the mean. */
  priorWeight?: number;
  maxGoals?: number;
}

export interface Prediction {
  lambda: number;
  mu: number;
  pH: number;
  pD: number;
  pA: number;
  pOver25: number;
  pUnder25: number;
  pBtts: number;
  /** Evidence behind each side's rating (decay-weighted match count). */
  homeWeight: number;
  awayWeight: number;
}

const MS_PER_DAY = 86_400_000;

function poissonPmf(k: number, lambda: number): number {
  let p = Math.exp(-lambda);
  for (let i = 1; i <= k; i++) p *= lambda / i;
  return p;
}

function tau(x: number, y: number, lambda: number, mu: number, rho: number): number {
  if (x === 0 && y === 0) return 1 - lambda * mu * rho;
  if (x === 0 && y === 1) return 1 + lambda * rho;
  if (x === 1 && y === 0) return 1 + mu * rho;
  if (x === 1 && y === 1) return 1 - rho;
  return 1;
}

export function fit(matches: Match[], opts: FitOptions): Model {
  const xi = opts.xi ?? 0.002;
  const iterations = opts.iterations ?? 100;
  const priorWeight = opts.priorWeight ?? 3;
  const asOfMs = opts.asOf.getTime();

  const train = matches
    .filter((m) => m.date.getTime() < asOfMs)
    .map((m) => ({ ...m, w: Math.exp((-xi * (asOfMs - m.date.getTime())) / MS_PER_DAY) }));

  if (train.length === 0) throw new Error("No training matches before asOf");

  const teamNames = new Set<string>();
  let wSum = 0;
  let homeGoals = 0;
  let awayGoals = 0;
  for (const m of train) {
    teamNames.add(m.home);
    teamNames.add(m.away);
    wSum += m.w;
    homeGoals += m.w * m.hg;
    awayGoals += m.w * m.ag;
  }
  const avgGoalsPerTeamGame = (homeGoals + awayGoals) / (2 * wSum);

  const attack = new Map<string, number>();
  const defense = new Map<string, number>();
  const weight = new Map<string, number>();
  for (const t of teamNames) {
    attack.set(t, Math.log(avgGoalsPerTeamGame));
    defense.set(t, 0);
    weight.set(t, 0);
  }
  for (const m of train) {
    weight.set(m.home, (weight.get(m.home) ?? 0) + m.w);
    weight.set(m.away, (weight.get(m.away) ?? 0) + m.w);
  }
  let home = Math.log(homeGoals / awayGoals);

  for (let it = 0; it < iterations; it++) {
    // Attack update
    const attNum = new Map<string, number>();
    const attDen = new Map<string, number>();
    for (const m of train) {
      attNum.set(m.home, (attNum.get(m.home) ?? 0) + m.w * m.hg);
      attDen.set(m.home, (attDen.get(m.home) ?? 0) + m.w * Math.exp(home + defense.get(m.away)!));
      attNum.set(m.away, (attNum.get(m.away) ?? 0) + m.w * m.ag);
      attDen.set(m.away, (attDen.get(m.away) ?? 0) + m.w * Math.exp(defense.get(m.home)!));
    }
    for (const t of teamNames) {
      const n = (attNum.get(t) ?? 0) + priorWeight * avgGoalsPerTeamGame;
      const d = (attDen.get(t) ?? 0) + priorWeight;
      attack.set(t, Math.log(n / d));
    }

    // Defense update (goals conceded)
    const defNum = new Map<string, number>();
    const defDen = new Map<string, number>();
    for (const m of train) {
      defNum.set(m.home, (defNum.get(m.home) ?? 0) + m.w * m.ag);
      defDen.set(m.home, (defDen.get(m.home) ?? 0) + m.w * Math.exp(attack.get(m.away)!));
      defNum.set(m.away, (defNum.get(m.away) ?? 0) + m.w * m.hg);
      defDen.set(m.away, (defDen.get(m.away) ?? 0) + m.w * Math.exp(attack.get(m.home)! + home));
    }
    for (const t of teamNames) {
      const n = (defNum.get(t) ?? 0) + priorWeight * avgGoalsPerTeamGame;
      const d = (defDen.get(t) ?? 0) + priorWeight * Math.exp(Math.log(avgGoalsPerTeamGame));
      defense.set(t, Math.log(n / d));
    }
    // Identifiability: center defense at 0, push the shift into attack.
    let meanDef = 0;
    for (const t of teamNames) meanDef += defense.get(t)!;
    meanDef /= teamNames.size;
    for (const t of teamNames) {
      defense.set(t, defense.get(t)! - meanDef);
      attack.set(t, attack.get(t)! + meanDef);
    }

    // Home advantage update
    let hNum = 0;
    let hDen = 0;
    for (const m of train) {
      hNum += m.w * m.hg;
      hDen += m.w * Math.exp(attack.get(m.home)! + defense.get(m.away)!);
    }
    home = Math.log(hNum / hDen);
  }

  // rho by grid search on the full DC log-likelihood
  let bestRho = 0;
  let bestLL = -Infinity;
  for (let rho = -0.2; rho <= 0.2001; rho += 0.01) {
    let ll = 0;
    for (const m of train) {
      const lambda = Math.exp(attack.get(m.home)! + defense.get(m.away)! + home);
      const mu = Math.exp(attack.get(m.away)! + defense.get(m.home)!);
      const t = tau(m.hg, m.ag, lambda, mu, rho);
      if (t <= 0) {
        ll = -Infinity;
        break;
      }
      ll += m.w * (Math.log(t) + Math.log(poissonPmf(m.hg, lambda)) + Math.log(poissonPmf(m.ag, mu)));
    }
    if (ll > bestLL) {
      bestLL = ll;
      bestRho = rho;
    }
  }

  const teams = new Map<string, TeamRating>();
  for (const t of teamNames) {
    teams.set(t, { attack: attack.get(t)!, defense: defense.get(t)!, weight: weight.get(t)! });
  }
  return { teams, home, rho: Number(bestRho.toFixed(2)), totalWeight: wSum, asOf: opts.asOf };
}

/** Rating used for a team the model has never seen: league average. */
function ratingFor(model: Model, team: string): TeamRating {
  const r = model.teams.get(team);
  if (r) return r;
  let att = 0;
  for (const t of model.teams.values()) att += t.attack;
  return { attack: att / model.teams.size, defense: 0, weight: 0 };
}

export function predict(model: Model, home: string, away: string, maxGoals = 10): Prediction {
  const h = ratingFor(model, home);
  const a = ratingFor(model, away);
  const lambda = Math.exp(h.attack + a.defense + model.home);
  const mu = Math.exp(a.attack + h.defense);

  const ph: number[] = [];
  const pa: number[] = [];
  for (let k = 0; k <= maxGoals; k++) {
    ph.push(poissonPmf(k, lambda));
    pa.push(poissonPmf(k, mu));
  }

  let pH = 0;
  let pD = 0;
  let pA = 0;
  let pOver25 = 0;
  let pBtts = 0;
  let total = 0;
  for (let x = 0; x <= maxGoals; x++) {
    for (let y = 0; y <= maxGoals; y++) {
      const p = Math.max(0, tau(x, y, lambda, mu, model.rho)) * ph[x] * pa[y];
      total += p;
      if (x > y) pH += p;
      else if (x === y) pD += p;
      else pA += p;
      if (x + y >= 3) pOver25 += p;
      if (x >= 1 && y >= 1) pBtts += p;
    }
  }
  return {
    lambda,
    mu,
    pH: pH / total,
    pD: pD / total,
    pA: pA / total,
    pOver25: pOver25 / total,
    pUnder25: 1 - pOver25 / total,
    pBtts: pBtts / total,
    homeWeight: h.weight,
    awayWeight: a.weight,
  };
}
