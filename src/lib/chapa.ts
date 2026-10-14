/**
 * Chapa hosted checkout. https://developer.chapa.co
 * Without CHAPA_SECRET_KEY (development), checkout activates immediately via the dev path.
 */
import crypto from "node:crypto";

const BASE = "https://api.chapa.co/v1";

export function chapaConfigured() {
  return !!process.env.CHAPA_SECRET_KEY;
}

export interface InitParams {
  txRef: string;
  amountEtb: number;
  phone: string | null;
  email: string | null;
  firstName: string;
  lastName: string;
  returnUrl: string;
  callbackUrl: string;
  title: string;
  description: string;
}

export async function initializePayment(p: InitParams): Promise<string> {
  const res = await fetch(`${BASE}/transaction/initialize`, {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.CHAPA_SECRET_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      amount: String(p.amountEtb),
      currency: "ETB",
      email: p.email ?? undefined,
      phone_number: p.phone?.replace(/^\+251/, "0") ?? undefined,
      first_name: p.firstName,
      last_name: p.lastName,
      tx_ref: p.txRef,
      callback_url: p.callbackUrl,
      return_url: p.returnUrl,
      customization: { title: p.title.slice(0, 16), description: p.description.slice(0, 50) },
    }),
  });
  const body = (await res.json()) as { status: string; message?: string; data?: { checkout_url: string } };
  if (!res.ok || body.status !== "success" || !body.data?.checkout_url) {
    throw new Error(`Chapa initialize failed: ${body.message ?? res.status}`);
  }
  return body.data.checkout_url;
}

export async function verifyPayment(txRef: string): Promise<{ success: boolean; amount: number; currency: string; raw: unknown }> {
  const res = await fetch(`${BASE}/transaction/verify/${encodeURIComponent(txRef)}`, {
    headers: { Authorization: `Bearer ${process.env.CHAPA_SECRET_KEY}` },
  });
  const body = (await res.json()) as { status: string; data?: { status: string; amount: number | string; currency: string } };
  return {
    success: res.ok && body.status === "success" && body.data?.status === "success",
    amount: Number(body.data?.amount ?? 0),
    currency: body.data?.currency ?? "",
    raw: body,
  };
}

/**
 * Chapa signs webhooks with HMAC-SHA256 and sends it in `chapa-signature` and `x-chapa-signature`.
 * The key is the "secret hash" you type into Dashboard → Settings → Webhooks (CHAPA_WEBHOOK_SECRET);
 * Chapa's own example uses the account secret key, so both are tried. The documented example hashes
 * JSON.stringify(body) rather than the raw bytes, so both encodings are tried too.
 */
export function verifyWebhookSignature(rawBody: string, headers: Headers): boolean {
  const secrets = [process.env.CHAPA_WEBHOOK_SECRET, process.env.CHAPA_SECRET_KEY].filter((s): s is string => !!s);
  if (secrets.length === 0) return false;
  let reserialized = rawBody;
  try {
    reserialized = JSON.stringify(JSON.parse(rawBody));
  } catch {
    /* keep raw */
  }
  const given = ["x-chapa-signature", "chapa-signature"].map((n) => headers.get(n)).filter((v): v is string => !!v);
  if (given.length === 0) return false;
  for (const secret of secrets) {
    for (const payload of new Set([rawBody, reserialized])) {
      const expected = crypto.createHmac("sha256", secret).update(payload).digest("hex");
      for (const g of given) {
        if (g.length === expected.length && crypto.timingSafeEqual(Buffer.from(g), Buffer.from(expected))) return true;
      }
    }
  }
  return false;
}
