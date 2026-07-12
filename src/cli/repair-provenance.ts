import { loadConfig } from "../config/env.js";
import { createDatabase } from "../db/database.js";
import { migrateToLatest } from "../db/migrate.js";
import { inspectProvenanceDebt, purgeUnattachedAggregatorSignals } from "../pipeline/provenance.js";

const config = loadConfig(process.env);
const db = createDatabase(config);

try {
  await migrateToLatest(db, config);
  const before = await inspectProvenanceDebt(db);
  if (!process.argv.includes("--confirm")) {
    console.log(JSON.stringify({ mode: "preview", before }, null, 2));
    process.exitCode = before.unattachedSignals ? 2 : 0;
  } else {
    const action = await purgeUnattachedAggregatorSignals(db);
    const after = await inspectProvenanceDebt(db);
    console.log(JSON.stringify({ mode: "confirmed", before, action, after }, null, 2));
  }
} finally {
  await db.destroy();
}
