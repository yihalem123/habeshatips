import crypto from "node:crypto";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { verifyWebhookSignature } from "./chapa";

const body = JSON.stringify({ event: "charge.success", tx_ref: "ht-x", status: "success", amount: "299" });

describe("chapa webhook signature", () => {
  const env = { ...process.env };
  beforeEach(() => {
    process.env.CHAPA_WEBHOOK_SECRET = "hash-123";
    process.env.CHAPA_SECRET_KEY = "CHASECK_TEST-abc";
  });
  afterEach(() => {
    process.env = { ...env };
  });

  function sig(secret: string, payload: string) {
    return crypto.createHmac("sha256", secret).update(payload).digest("hex");
  }

  it("accepts a signature from the dashboard secret hash in either header", () => {
    expect(verifyWebhookSignature(body, new Headers({ "x-chapa-signature": sig("hash-123", body) }))).toBe(true);
    expect(verifyWebhookSignature(body, new Headers({ "chapa-signature": sig("hash-123", body) }))).toBe(true);
  });

  it("accepts a signature made with the account secret key over re-serialised JSON", () => {
    const pretty = JSON.stringify(JSON.parse(body), null, 2);
    expect(verifyWebhookSignature(pretty, new Headers({ "chapa-signature": sig("CHASECK_TEST-abc", JSON.stringify(JSON.parse(pretty))) }))).toBe(true);
  });

  it("rejects a bad or missing signature", () => {
    expect(verifyWebhookSignature(body, new Headers({ "x-chapa-signature": sig("wrong", body) }))).toBe(false);
    expect(verifyWebhookSignature(body, new Headers())).toBe(false);
  });
});
