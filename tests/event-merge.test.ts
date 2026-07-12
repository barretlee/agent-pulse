import { randomUUID } from "node:crypto";
import { afterEach, describe, expect, it } from "vitest";
import { loadConfig } from "../src/config/env.js";
import { createDatabase } from "../src/db/database.js";
import { migrateToLatest } from "../src/db/migrate.js";
import { seedDatabase } from "../src/db/seed.js";
import { findEventMergeCandidates, mergeEventCandidates } from "../src/pipeline/event-merge.js";

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

describe("event merge candidate queue", () => {
  it("groups fragmented model events without mutating them", async () => {
    const db = await setup();
    const original = await db
      .selectFrom("events")
      .selectAll()
      .where("slug", "=", "openai-o1-test-time-reasoning")
      .executeTakeFirstOrThrow();
    const duplicateId = randomUUID();
    await db
      .insertInto("events")
      .values({
        ...original,
        id: duplicateId,
        slug: "openai-o1-follow-up-fixture",
        title: "OpenAI o1 capability expansion through test-time compute",
        status: "review",
        manual_override: 0,
        published_at: null,
      })
      .execute();

    const groups = await findEventMergeCandidates(db);
    const group = groups.find((item) => item.events.some((event) => event.id === duplicateId));

    expect(group?.events).toHaveLength(2);
    expect(group?.targetEventId).toBe(original.id);
    expect(
      await db
        .selectFrom("events")
        .select(({ fn }) => fn.countAll<number>().as("count"))
        .executeTakeFirstOrThrow(),
    ).toMatchObject({ count: 37 });

    const result = await mergeEventCandidates(db, {
      targetEventId: original.id,
      sourceEventIds: [duplicateId],
      reason: "entity_fingerprint",
      mergedBy: "test",
    });
    expect(result).toEqual({ targetEventId: original.id, merged: 1 });
    expect(
      await db.selectFrom("events").select("id").where("id", "=", duplicateId).executeTakeFirst(),
    ).toBeUndefined();
    expect(
      await db
        .selectFrom("event_merges")
        .select(["target_event_id", "source_event_id", "merged_by"])
        .executeTakeFirstOrThrow(),
    ).toEqual({
      target_event_id: original.id,
      source_event_id: duplicateId,
      merged_by: "test",
    });
  });

  it("keeps incidents separate from model releases", async () => {
    const db = await setup();
    const original = await db
      .selectFrom("events")
      .selectAll()
      .where("slug", "=", "openai-o1-test-time-reasoning")
      .executeTakeFirstOrThrow();
    const incidentId = randomUUID();
    await db
      .insertInto("events")
      .values({
        ...original,
        id: incidentId,
        slug: "openai-o1-outage-fixture",
        title: "OpenAI o1 outage incident",
        status: "review",
        manual_override: 0,
        published_at: null,
      })
      .execute();

    const groups = await findEventMergeCandidates(db);

    expect(groups.some((item) => item.events.some((event) => event.id === incidentId))).toBe(false);
  });

  it("refuses to merge a published event as a disposable branch", async () => {
    const db = await setup();
    const events = await db
      .selectFrom("events")
      .selectAll()
      .where("status", "=", "published")
      .limit(2)
      .execute();

    await expect(
      mergeEventCandidates(db, {
        targetEventId: events[0]?.id ?? "missing",
        sourceEventIds: [events[1]?.id ?? "missing"],
        reason: "manual-review",
        mergedBy: "test",
      }),
    ).rejects.toThrow("Published source events must be unpublished before merge");
  });
});
