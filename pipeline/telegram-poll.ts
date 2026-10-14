/**
 * Development long-polling runner for the Telegram bot (no public URL needed).
 * Usage: pnpm telegram:poll   (production uses the webhook route instead)
 */
import "./env";
import { tg } from "../src/lib/telegram";
import { handleUpdate, type TgUpdate } from "../src/lib/telegram-updates";

async function main() {
  let offset = 0;
  console.log("telegram: polling for updates (ctrl-c to stop)");
  for (;;) {
    const updates = await tg<TgUpdate[]>("getUpdates", { offset, timeout: 30, allowed_updates: ["message", "chat_member"] });
    for (const u of updates) {
      offset = u.update_id + 1;
      try {
        await handleUpdate(u);
      } catch (err) {
        console.error("update failed", err);
      }
    }
  }
}
main().catch((err) => {
  console.error(err);
  process.exit(1);
});
