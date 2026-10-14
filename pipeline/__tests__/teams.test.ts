import { describe, expect, it } from "vitest";
import { canonicalTeam, fixtureId, normalizeTeam } from "../data/teams";

describe("team canonicalisation", () => {
  it("maps football-data.org names", () => {
    expect(canonicalTeam("Manchester City FC")).toBe("Man City");
    expect(canonicalTeam("Wolverhampton Wanderers FC")).toBe("Wolves");
    expect(canonicalTeam("Nottingham Forest FC")).toBe("Nott'm Forest");
    expect(canonicalTeam("Club Atlético de Madrid")).toBe("Ath Madrid");
    expect(canonicalTeam("FC Internazionale Milano")).toBe("Inter");
    expect(canonicalTeam("1. FC Köln")).toBe("FC Koln");
    expect(canonicalTeam("Paris Saint-Germain FC")).toBe("Paris SG");
    expect(canonicalTeam("Borussia Mönchengladbach")).toBe("M'gladbach");
  });

  it("maps The Odds API and ESPN names", () => {
    expect(canonicalTeam("Manchester United")).toBe("Man United");
    expect(canonicalTeam("Tottenham Hotspur")).toBe("Tottenham");
    expect(canonicalTeam("Brighton and Hove Albion")).toBe("Brighton");
    expect(canonicalTeam("Athletic Bilbao")).toBe("Ath Bilbao");
    expect(canonicalTeam("Bayer Leverkusen")).toBe("Leverkusen");
    expect(canonicalTeam("Olympique Marseille")).toBe("Marseille");
    expect(canonicalTeam("Coventry City")).toBe("Coventry");
    expect(canonicalTeam("Newcastle United")).toBe("Newcastle");
  });

  it("maps OpenLigaDB (German-style) names", () => {
    expect(canonicalTeam("FC Arsenal")).toBe("Arsenal");
    expect(canonicalTeam("Inter Mailand")).toBe("Inter");
    expect(canonicalTeam("AS Rom")).toBe("Roma");
    expect(canonicalTeam("Slavia Prag")).toBe("Slavia Prague");
    expect(canonicalTeam("FC Brügge")).toBe("Club Brugge");
    expect(canonicalTeam("Espanyol Barcelona")).toBe("Espanol");
    expect(canonicalTeam("FC Villareal")).toBe("Villarreal");
    expect(canonicalTeam("Deportivo A Coruña")).toBe("La Coruna");
    expect(canonicalTeam("SSC Napoli ")).toBe("Napoli");
    expect(canonicalTeam("Paris St. Germain")).toBe("Paris SG");
  });

  it("keeps canonical names stable and refuses junk", () => {
    expect(canonicalTeam("Man City")).toBe("Man City");
    expect(canonicalTeam("Real Madrid")).toBe("Real Madrid");
    expect(canonicalTeam("Real Betis")).toBe("Betis");
    expect(canonicalTeam("Real Sociedad")).toBe("Sociedad");
    expect(canonicalTeam("Random XI")).toBeNull();
    expect(normalizeTeam("1. FSV Mainz 05")).toBe("mainz");
  });

  it("builds deterministic fixture ids", () => {
    expect(fixtureId("E0", new Date("2026-10-17T14:00:00Z"), "Nott'm Forest", "Man City")).toBe("E0-2026-10-17-nottm-forest-man-city");
  });
});
