import { describe, expect, it } from "vitest";
import { linkToken, verifyLinkToken, escapeHtml } from "../../src/lib/telegram";
import { tipsSms, reminderSms } from "../delivery/format";
import type { TipView } from "../../src/lib/queries";

const tip = (over: Partial<TipView> = {}): TipView => ({
  id: "t1", roomId: "r", roomSlug: "safe-bet", roomNameEn: "Safe Bet", roomNameAm: "x", home: "Arsenal", away: "Lille", leagueName: "UEFA Champions League",
  kickoffAt: new Date("2026-10-13T19:00:00Z"), fixtureStatus: "scheduled", homeGoals: null, awayGoals: null, market: "1X2", selection: "H", odds: 1.22,
  modelProb: 0.78, confidence: 4, result: "pending", profit: null, publishedAt: new Date(), hash: "h", rationaleEn: "Head\n\nBody", rationaleAm: "ራስ\n\nአካል", isBacktest: false,
  ...over,
});

describe("telegram link tokens", () => {
  it("round-trips and rejects tampering", () => {
    const uid = "3f2a9c1e-1111-2222-3333-444455556666";
    const tok = linkToken(uid);
    expect(tok.length).toBeLessThanOrEqual(64);
    expect(verifyLinkToken(tok)).toBe(uid);
    expect(verifyLinkToken(tok.slice(0, -1) + "x")).toBeNull();
    expect(verifyLinkToken("garbage")).toBeNull();
  });
  it("escapes html", () => {
    expect(escapeHtml("<b>&")).toBe("&lt;b&gt;&amp;");
  });
});

describe("sms formatting", () => {
  it("keeps a one-pick message short and ascii", () => {
    const s = tipsSms("Safe Bet", [tip()]);
    expect(s).toContain("Arsenal v Lille: Arsenal to win @1.22");
    expect(s.length).toBeLessThan(160);
    expect(/^[\x00-\x7F]*$/.test(s)).toBe(true);
  });
  it("caps at three picks", () => {
    const s = tipsSms("Safe Bet", [tip(), tip({ home: "A" }), tip({ home: "B" }), tip({ home: "C" })]);
    expect(s).toContain("+1 more");
  });
  it("formats reminders", () => {
    expect(reminderSms("Safe Bet", 1)).toContain("ends in 1 day.");
    expect(reminderSms("Safe Bet", 3)).toContain("ends in 3 days.");
  });
});
