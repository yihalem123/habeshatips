import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { getCurrentUser } from "@/lib/session";

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.redirect(new URL("/login", req.url), 303);
  const form = await req.formData();
  const smsOptIn = form.get("sms_opt_in") === "on";
  const locale = form.get("locale") === "am" ? "am" : "en";
  await db.update(users).set({ smsOptIn, locale }).where(eq(users.id, user.id));
  return NextResponse.redirect(new URL("/dashboard", req.url), 303);
}
