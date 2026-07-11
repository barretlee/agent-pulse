import { loadConfig } from "../config/env.js";
import { createDatabase } from "../db/database.js";
import { migrateToLatest } from "../db/migrate.js";
import { seedDatabase } from "../db/seed.js";

const config = loadConfig();
const db = createDatabase(config);
try {
  await migrateToLatest(db, config);
  await seedDatabase(db);
  console.log("[db] seed complete");
} finally {
  await db.destroy();
}
