import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const set = url.searchParams.get("set") === "am" ? "am" : "en";
  const back = req.headers.get("referer") ?? new URL("/", req.url).toString();
  const res = NextResponse.redirect(back, 303);
  res.cookies.set("locale", set, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
  return res;
}
