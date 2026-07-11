import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import BetterSqlite3 from "better-sqlite3";
import { Kysely, MysqlDialect, SqliteDialect } from "kysely";
import { createPool } from "mysql2";
import type { AppConfig } from "../config/env.js";
import type { DatabaseSchema } from "./types.js";

export function createDatabase(config: Pick<AppConfig, "databaseUrl">): Kysely<DatabaseSchema> {
  if (config.databaseUrl.startsWith("sqlite:")) {
    const filename = config.databaseUrl.slice("sqlite:".length);
    if (filename !== ":memory:") mkdirSync(dirname(filename), { recursive: true });
    const database = new BetterSqlite3(filename);
    database.pragma("journal_mode = WAL");
    database.pragma("foreign_keys = ON");
    database.pragma("busy_timeout = 5000");
    return new Kysely<DatabaseSchema>({ dialect: new SqliteDialect({ database }) });
  }

  if (config.databaseUrl.startsWith("mysql://")) {
    return new Kysely<DatabaseSchema>({
      dialect: new MysqlDialect({ pool: createPool(config.databaseUrl) }),
    });
  }

  throw new Error("DATABASE_URL must start with sqlite: or mysql://");
}
