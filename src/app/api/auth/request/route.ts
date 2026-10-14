import { NextResponse } from "next/server";
import { requestOtp } from "@/lib/otp";

export async function POST(req: Request) {
  const form = await req.formData();
  const phone = String(form.get("phone") ?? "");
  const next = String(form.get("next") ?? "/dashboard");
  const r = await requestOtp(phone);
  const url = new URL(r ? "/login/verify" : "/login", req.url);
  if (!r) url.searchParams.set("error", "Enter a valid phone number.");
  else {
    url.searchParams.set("phone", r.phone);
    url.searchParams.set("next", next);
    if (r.devCode) url.searchParams.set("dev", r.devCode);
  }
  return NextResponse.redirect(url, 303);
}
