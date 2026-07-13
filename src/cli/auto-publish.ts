/** Publish ready Events and qualified Scout insights, then enforce lifecycle policy. */

import { loadConfig } from "../config/env.js";
import { createDatabase } from "../db/database.js";
import { migrateToLatest } from "../db/migrate.js";
import { runAutoPipeline } from "../pipeline/auto-publish.js";

const config = loadConfig();
const db = createDatabase(config);
try {
  await migrateToLatest(db, config);
  const result = await runAutoPipeline(db);
  console.log(JSON.stringify(result, null, 2));
} finally {
  await db.destroy();
}
