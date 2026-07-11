import { loadConfig } from "../config/env.js";
import { createDatabase } from "../db/database.js";
import { migrateToLatest } from "../db/migrate.js";

const config = loadConfig();
const db = createDatabase(config);
try {
  await migrateToLatest(db, config);
} finally {
  await db.destroy();
}
