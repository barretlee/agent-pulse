import { loadConfig } from "../config/env.js";
import { createDatabase } from "../db/database.js";
import { migrateToLatest } from "../db/migrate.js";
import { seedDatabase } from "../db/seed.js";
import { exportStaticSite } from "../pipeline/export.js";
import { buildApp } from "../server/app.js";

const config = loadConfig();
const db = createDatabase(config);
await migrateToLatest(db, config);
await seedDatabase(db);
await exportStaticSite(db, config);
const app = await buildApp(db, config);

const shutdown = async () => {
  await app.close();
  await db.destroy();
  process.exit(0);
};
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

await app.listen({ host: config.HOST, port: config.PORT });
console.log(`Agent Pulse: http://${config.HOST}:${config.PORT}`);
console.log(`Admin: http://${config.HOST}:${config.PORT}/admin/`);
