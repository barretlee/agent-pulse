import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { loadConfig } from "../src/config/env.js";
import { createDatabase } from "../src/db/database.js";
import { migrateToLatest } from "../src/db/migrate.js";
import { Repository } from "../src/db/repository.js";
import { seedDatabase } from "../src/db/seed.js";
import { exportStaticSite } from "../src/pipeline/export.js";
import { buildApp } from "../src/server/app.js";

const databases: ReturnType<typeof createDatabase>[] = [];
afterEach(async () => {
  while (databases.length) await databases.pop()?.destroy();
});

describe("SQLite application", () => {
  it("migrates, seeds and exports a privacy-safe static site", async () => {
    const base = loadConfig({ NODE_ENV: "test", DATABASE_URL: "sqlite::memory:" });
    const temp = await mkdtemp(join(tmpdir(), "agent-pulse-"));
    const config = { ...base, distDir: join(temp, "dist") };
    const db = createDatabase(config);
    databases.push(db);
    await migrateToLatest(db, config);
    await seedDatabase(db);

    const repository = new Repository(db);
    expect((await repository.publicEvents()).length).toBeGreaterThanOrEqual(5);
    const result = await exportStaticSite(db, config);
    expect(result).toMatchObject({ events: 5, tracks: 10 });
    const timeline = await readFile(join(config.distDir, "data/timeline.json"), "utf8");
    expect(timeline).not.toContain("ADMIN_TOKEN");
    expect(timeline).not.toContain("/Users/");
    expect(JSON.parse(timeline).events[0]).not.toHaveProperty("manual_override");
  });

  it("protects production admin APIs", async () => {
    const config = loadConfig({
      NODE_ENV: "production",
      DATABASE_URL: "sqlite::memory:",
      ADMIN_TOKEN: "a-secure-token-for-tests",
    });
    const db = createDatabase(config);
    databases.push(db);
    await migrateToLatest(db, config);
    await seedDatabase(db);
    await exportStaticSite(db, config);
    const app = await buildApp(db, config);
    const unauthorized = await app.inject({ method: "GET", url: "/api/admin/dashboard" });
    expect(unauthorized.statusCode).toBe(401);
    const authorized = await app.inject({
      method: "GET",
      url: "/api/admin/dashboard",
      headers: { authorization: "Bearer a-secure-token-for-tests" },
    });
    expect(authorized.statusCode).toBe(200);
    await app.close();
  });
});
