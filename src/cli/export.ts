import { loadConfig } from "../config/env.js";
import { createDatabase } from "../db/database.js";
import { migrateToLatest } from "../db/migrate.js";
import { seedDatabase } from "../db/seed.js";
import { exportStaticSite } from "../pipeline/export.js";

const config = loadConfig();
const db = createDatabase(config);
try {
  await migrateToLatest(db, config);
  await seedDatabase(db);
  console.log(JSON.stringify(await exportStaticSite(db, config), null, 2));
} finally {
  await db.destroy();
}
