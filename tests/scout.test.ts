import { randomUUID } from "node:crypto";
import { afterEach, describe, expect, it } from "vitest";
import { loadConfig } from "../src/config/env.js";
import { createDatabase } from "../src/db/database.js";
import { migrateToLatest } from "../src/db/migrate.js";
import { Repository } from "../src/db/repository.js";
import { seedDatabase } from "../src/db/seed.js";
import type { EventRow } from "../src/db/types.js";
import {
  buildScoutCard,
  PUBLIC_SCOUT_POOL_TARGET,
  runScout,
  scoutPublicationDecision,
} from "../src/pipeline/scout.js";

const databases: ReturnType<typeof createDatabase>[] = [];

afterEach(async () => {
  while (databases.length) await databases.pop()?.destroy();
});

const event = {
  title: "A new agent capability ships",
  confidence_score: 82,
  heat_score: 76,
  impact_score: 91,
  value_score: 88,
} as EventRow;

describe("Scout deterministic cards", () => {
  it.each([
    "venture",
    "media",
    "work",
    "learning",
    "artifact",
    "influence",
  ] as const)("creates evidence-shaped %s opportunities", (kind) => {
    const card = buildScoutCard(event, kind);
    expect(card.hypothesis.length).toBeGreaterThan(30);
    expect(card.suggested_action.length).toBeGreaterThan(30);
    expect(card.artifact_idea.length).toBeGreaterThan(10);
    expect(card.counter_signals).toContain("证据");
    expect(card.total_score).toBeGreaterThan(70);
    expect(
      [card.title, card.observation, card.hypothesis, card.why_now, card.counter_signals].join(" "),
    ).not.toMatch(/真正机会不在|工作杠杆|短期噪声还是结构性转折|一次性热点表达/);
  });

  it("fills distinct opportunity kinds and auto-publishes only viable cards", async () => {
    const config = loadConfig({ NODE_ENV: "test", DATABASE_URL: "sqlite::memory:" });
    const db = createDatabase(config);
    databases.push(db);
    await migrateToLatest(db, config);
    await seedDatabase(db);

    const initiallyPublished = await db
      .selectFrom("scout_insights")
      .select("id")
      .where("status", "=", "published")
      .execute();
    const first = await runScout(db, 3);
    const second = await runScout(db, 3);

    expect(first.created).toBe(3);
    expect(second.created).toBe(3);
    expect(second.scanned).toBeGreaterThanOrEqual(3);
    expect(first.published).toBeGreaterThan(0);
    expect(second.published).toBeGreaterThan(0);
    expect(first.archived + first.published).toBe(first.created);
    expect(second.archived + second.published).toBe(second.created);
    expect(
      await db
        .selectFrom("scout_insights")
        .select("id")
        .where("status", "=", "published")
        .execute(),
    ).toHaveLength(initiallyPublished.length + first.published + second.published);
    expect(
      new Set(
        (
          await db
            .selectFrom("scout_insights")
            .select("kind")
            .where("status", "=", "published")
            .execute()
        ).map((insight) => insight.kind),
      ).size,
    ).toBeGreaterThanOrEqual(4);
  });

  it("publishes only insights that clear every autonomous gate", () => {
    expect(scoutPublicationDecision(buildScoutCard(event, "venture"))).toEqual({
      allowed: true,
      blockers: [],
    });
    expect(
      scoutPublicationDecision({
        total_score: 71,
        evidence_score: 69,
        confidence_score: 70,
        novelty_score: 54,
      }),
    ).toMatchObject({ allowed: false, blockers: expect.arrayContaining(["total_score_below_72"]) });
  });

  it("deduplicates equivalent published opportunities before public export", async () => {
    const config = loadConfig({ NODE_ENV: "test", DATABASE_URL: "sqlite::memory:" });
    const db = createDatabase(config);
    databases.push(db);
    await migrateToLatest(db, config);
    await seedDatabase(db);
    const original = await db
      .selectFrom("scout_insights")
      .selectAll()
      .where("status", "=", "published")
      .executeTakeFirstOrThrow();
    await db
      .insertInto("scout_insights")
      .values({
        ...original,
        id: randomUUID(),
        slug: `${original.slug}-duplicate`,
        title: ` ${original.title}！`,
        total_score: Math.max(0, original.total_score - 1),
      })
      .execute();

    const publicInsights = await new Repository(db).publicScoutInsights();
    const normalized = publicInsights.map(
      (insight) =>
        `${insight.kind}:${insight.title
          .normalize("NFKC")
          .toLocaleLowerCase()
          .replace(/[\s\p{P}\p{S}]+/gu, "")}`,
    );
    expect(new Set(normalized).size).toBe(normalized.length);

    expect(await runScout(db, 1)).toMatchObject({ deduplicated: 1 });
    expect(
      await db
        .selectFrom("scout_insights")
        .select("status")
        .where("slug", "=", `${original.slug}-duplicate`)
        .executeTakeFirstOrThrow(),
    ).toEqual({ status: "archived" });
  });

  it("fills a bounded public pool and replaces expired opportunities", async () => {
    const config = loadConfig({ NODE_ENV: "test", DATABASE_URL: "sqlite::memory:" });
    const db = createDatabase(config);
    databases.push(db);
    await migrateToLatest(db, config);
    await seedDatabase(db);
    const original = await db
      .selectFrom("scout_insights")
      .selectAll()
      .where("status", "=", "published")
      .executeTakeFirstOrThrow();
    const fixtures = Array.from({ length: PUBLIC_SCOUT_POOL_TARGET - 1 }, (_, index) => ({
      ...original,
      id: randomUUID(),
      slug: `pool-fixture-${index}`,
      kind:
        ["venture", "media", "work", "learning", "artifact", "influence"][index % 6] ?? "venture",
      title: `Pool fixture ${index}`,
      cooldown_key: `pool:fixture-${index}`,
      expires_at: "2026-07-20T00:00:00.000Z",
    }));
    await db.insertInto("scout_insights").values(fixtures).execute();

    expect(await runScout(db, 12)).toMatchObject({
      created: 0,
      publishedPoolBefore: PUBLIC_SCOUT_POOL_TARGET,
      publishedPoolTarget: PUBLIC_SCOUT_POOL_TARGET,
    });

    const expiredId = fixtures[0]?.id;
    if (!expiredId) throw new Error("Expired Scout fixture missing");
    await db
      .updateTable("scout_insights")
      .set({ expires_at: "2020-01-01T00:00:00.000Z" })
      .where("id", "=", expiredId)
      .execute();
    expect(await runScout(db, 12)).toMatchObject({
      created: 1,
      expired: 1,
      publishedPoolBefore: PUBLIC_SCOUT_POOL_TARGET - 1,
    });
  });
});
