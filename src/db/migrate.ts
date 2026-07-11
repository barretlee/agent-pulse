import { promises as fs } from "node:fs";
import path from "node:path";
import type { Kysely } from "kysely";
import { FileMigrationProvider, Migrator } from "kysely";
import type { AppConfig } from "../config/env.js";
import type { DatabaseSchema } from "./types.js";

export async function migrateToLatest(
  db: Kysely<DatabaseSchema>,
  config: Pick<AppConfig, "rootDir">,
): Promise<void> {
  const migrator = new Migrator({
    db,
    provider: new FileMigrationProvider({
      fs,
      path,
      migrationFolder: path.join(config.rootDir, "src/db/migrations"),
    }),
  });

  const { error, results } = await migrator.migrateToLatest();
  for (const result of results ?? []) {
    const marker = result.status === "Success" ? "applied" : result.status.toLowerCase();
    console.log(`[db] ${marker}: ${result.migrationName}`);
  }
  if (error) throw error;
}
