import { randomUUID } from "node:crypto";
import { afterEach, describe, expect, it } from "vitest";
import { loadConfig } from "../src/config/env.js";
import { createDatabase } from "../src/db/database.js";
import { migrateToLatest } from "../src/db/migrate.js";
import { Repository } from "../src/db/repository.js";
import { seedDatabase } from "../src/db/seed.js";
import {
  inspectProvenanceDebt,
  purgeUnattachedAggregatorSignals,
} from "../src/pipeline/provenance.js";

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

describe("aggregator provenance debt", () => {
  it("purges only unattached aggregator signals", async () => {
    const db = await setup();
    const source = await db
      .selectFrom("sources")
      .select("id")
      .where("slug", "=", "aihot")
      .executeTakeFirstOrThrow();
    const event = await db.selectFrom("events").select("id").limit(1).executeTakeFirstOrThrow();
    const attachedId = await insertAggregatorSignal(db, source.id, "attached");
    await insertAggregatorSignal(db, source.id, "unattached");
    await new Repository(db).attachSignal(event.id, attachedId, "legacy", 1);

    await expect(inspectProvenanceDebt(db)).resolves.toMatchObject({
      aggregatorSignals: 2,
      unattachedSignals: 1,
      attachedSignals: 1,
    });
    await expect(purgeUnattachedAggregatorSignals(db)).resolves.toEqual({
      removed: 1,
      retainedForReview: 1,
    });
    await expect(inspectProvenanceDebt(db)).resolves.toMatchObject({
      aggregatorSignals: 1,
      unattachedSignals: 0,
      attachedSignals: 1,
    });
  });
});

async function insertAggregatorSignal(
  db: ReturnType<typeof createDatabase>,
  sourceId: string,
  suffix: string,
): Promise<string> {
  const id = randomUUID();
  const timestamp = new Date().toISOString();
  await db
    .insertInto("signals")
    .values({
      id,
      source_id: sourceId,
      external_id: suffix,
      canonical_url: `https://aggregator.example/${suffix}`,
      url_hash: `url-${id}`,
      title: `Legacy ${suffix}`,
      summary: "Legacy aggregator-owned fact signal",
      author: null,
      language: "en",
      published_at: timestamp,
      collected_at: timestamp,
      category: "industry",
      tags_json: "[]",
      metrics_json: "{}",
      raw_meta_json: "{}",
      content_hash: `content-${id}`,
      created_at: timestamp,
      updated_at: timestamp,
    })
    .execute();
  return id;
}
