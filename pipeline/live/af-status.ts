/** Print API-Football account status: plan, daily limit, requests used. */
import "../env";
import { status } from "../data/api-football";

status()
  .then((r) => {
    console.log(JSON.stringify(r.response, null, 2));
    process.exit(0);
  })
  .catch((err) => {
    console.error(err.message);
    process.exit(1);
  });
