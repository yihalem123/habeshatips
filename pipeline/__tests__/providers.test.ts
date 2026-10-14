import { describe, expect, it } from "vitest";
import { americanToDecimal } from "../providers/espn";
import { cacheKeyFor } from "../providers/http";

describe("espn odds conversion", () => {
  it("converts American odds to decimal", () => {
    expect(americanToDecimal(-150)).toBeCloseTo(1.667, 3);
    expect(americanToDecimal("+110")).toBeCloseTo(2.1, 3);
    expect(americanToDecimal(265)).toBeCloseTo(3.65, 3);
    expect(americanToDecimal("-100")).toBe(2);
    expect(americanToDecimal(null)).toBeNull();
    expect(americanToDecimal("")).toBeNull();
  });
});

describe("http cache keys", () => {
  it("ignores API keys in the cache key", () => {
    const a = cacheKeyFor("https://api.the-odds-api.com/v4/sports/soccer_epl/odds?apiKey=secret1&markets=h2h");
    const b = cacheKeyFor("https://api.the-odds-api.com/v4/sports/soccer_epl/odds?apiKey=secret2&markets=h2h");
    expect(a).toBe(b);
    expect(a).not.toContain("secret");
  });
});
