import { loadConfig } from "../config/env.js";
import { createDatabase } from "../db/database.js";
import { migrateToLatest } from "../db/migrate.js";
import {
  findUnqualifiedActivations,
  reconcileUnqualifiedActivations,
} from "../pipeline/activation-audit.js";

const config = loadConfig(process.env);
const db = createDatabase(config);

try {
  await migrateToLatest(db, config);
  const candidates = await findUnqualifiedActivations(db);
  if (!process.argv.includes("--confirm")) {
    console.log(JSON.stringify({ mode: "preview", candidates }, null, 2));
    process.exitCode = candidates.length ? 2 : 0;
  } else {
    const action = await reconcileUnqualifiedActivations(db);
    console.log(JSON.stringify({ mode: "confirmed", candidates, action }, null, 2));
  }
} finally {
  await db.destroy();
}
