import { loadConfig } from "../config/env.js";
import { createDatabase } from "../db/database.js";
import { migrateToLatest } from "../db/migrate.js";
import { seedDatabase } from "../db/seed.js";
import { restoreRepositorySnapshot, writeRepositorySnapshot } from "../pipeline/snapshot.js";

const command = process.argv[2];
if (command !== "restore" && command !== "write") {
  throw new Error("Usage: npm run db:snapshot -- <restore|write>");
}

const config = loadConfig();
const db = createDatabase(config);
try {
  await migrateToLatest(db, config);
  const result =
    command === "restore"
      ? await restoreSnapshot()
      : await writeRepositorySnapshot(db, config.rootDir);
  console.log(JSON.stringify(result, null, 2));
} finally {
  await db.destroy();
}

async function restoreSnapshot() {
  await seedDatabase(db);
  return restoreRepositorySnapshot(db, config.rootDir);
}
