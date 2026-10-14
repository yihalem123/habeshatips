import { NextResponse } from "next/server";
import { handleUpdate, type TgUpdate } from "@/lib/telegram-updates";

/** Set with: setWebhook?url=https://<domain>/api/telegram/webhook&secret_token=$TELEGRAM_WEBHOOK_SECRET&allowed_updates=["message","chat_member"] */
export async function POST(req: Request) {
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (secret && req.headers.get("x-telegram-bot-api-secret-token") !== secret) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const update = (await req.json()) as TgUpdate;
  try {
    await handleUpdate(update);
  } catch (err) {
    console.error("telegram update failed", err);
  }
  return NextResponse.json({ ok: true });
}
