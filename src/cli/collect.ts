import { loadConfig } from "../config/env.js";
import { createDatabase } from "../db/database.js";
import { migrateToLatest } from "../db/migrate.js";
import { clusterSignals } from "../pipeline/cluster.js";
import { collectSources } from "../pipeline/collect.js";

const config = loadConfig();
const db = createDatabase(config);
try {
  await migrateToLatest(db, config);
  if (process.argv.includes("--backfill")) {
    await db
      .updateTable("sources")
      .set({ state_json: "{}" })
      .where("enabled", "=", 1)
      .where("lifecycle_status", "in", ["active", "degraded"])
      .execute();
    console.log("[collect] bounded backfill enabled: conditional request state cleared");
  }
  const sourceId = process.argv.find((argument) => argument.startsWith("--source="))?.split("=")[1];
  const collection = await collectSources(db, config, sourceId);
  const clustering = await clusterSignals(db);
  console.log(JSON.stringify({ collection, clustering }, null, 2));
} finally {
  await db.destroy();
}
