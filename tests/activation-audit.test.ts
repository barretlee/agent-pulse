import { afterEach, describe, expect, it } from "vitest";
import { loadConfig } from "../src/config/env.js";
import { createDatabase } from "../src/db/database.js";
import { migrateToLatest } from "../src/db/migrate.js";
import { seedDatabase } from "../src/db/seed.js";
import {
  findUnqualifiedActivations,
  reconcileUnqualifiedActivations,
} from "../src/pipeline/activation-audit.js";

const databases: ReturnType<typeof createDatabase>[] = [];

afterEach(async () => {
  while (databases.length) await databases.pop()?.destroy();
});

async function setup() {
  const config = loadConfig({ NODE_ENV: "test", DATABASE_URL: "sqlite::memory:" });
  const db = createDatabase(config);
  databases.push(db);
  await migrateToLatest(db, config);
  await seedDatabase(db);
  return db;
}

describe("activation qualification audit", () => {
  it("moves legacy one-shot activations back to shadow without deleting data", async () => {
    const db = await setup();
    const source = await db
      .selectFrom("sources")
      .selectAll()
      .where("slug", "=", "qwen")
      .executeTakeFirstOrThrow();
    await db
      .updateTable("sources")
      .set({ enabled: 1, lifecycle_status: "active" })
      .where("id", "=", source.id)
      .execute();
    const beforeSignals = await db
      .selectFrom("signals")
      .select(({ fn }) => fn.countAll<number>().as("count"))
      .executeTakeFirstOrThrow();

    const candidates = await findUnqualifiedActivations(db);
    expect(candidates.map((item) => item.slug)).toContain("qwen");
    await expect(reconcileUnqualifiedActivations(db)).resolves.toMatchObject({
      movedToShadow: 1,
      slugs: ["qwen"],
    });
    await expect(
      db
        .selectFrom("sources")
        .select(["enabled", "lifecycle_status"])
        .where("id", "=", source.id)
        .executeTakeFirstOrThrow(),
    ).resolves.toEqual({ enabled: 0, lifecycle_status: "shadow" });
    const afterSignals = await db
      .selectFrom("signals")
      .select(({ fn }) => fn.countAll<number>().as("count"))
      .executeTakeFirstOrThrow();
    expect(afterSignals.count).toBe(beforeSignals.count);
  });

  it("does not reinterpret catalog canaries as unauthorized activations", async () => {
    const db = await setup();
    const candidates = await findUnqualifiedActivations(db);
    expect(candidates).toEqual([]);
  });
});
