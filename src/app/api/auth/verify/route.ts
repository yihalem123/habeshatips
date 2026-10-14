import { NextResponse } from "next/server";
import { verifyOtp } from "@/lib/otp";
import { createSession } from "@/lib/session";

export async function POST(req: Request) {
  const form = await req.formData();
  const phone = String(form.get("phone") ?? "");
  const code = String(form.get("code") ?? "");
  const next = String(form.get("next") ?? "/dashboard");
  const uid = await verifyOtp(phone, code);
  if (!uid) {
    const url = new URL("/login/verify", req.url);
    url.searchParams.set("phone", phone);
    url.searchParams.set("next", next);
    url.searchParams.set("error", "Wrong or expired code.");
    return NextResponse.redirect(url, 303);
  }
  await createSession(uid);
  return NextResponse.redirect(new URL(next.startsWith("/") ? next : "/dashboard", req.url), 303);
}
