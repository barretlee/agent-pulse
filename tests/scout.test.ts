import { afterEach, describe, expect, it } from "vitest";
import { loadConfig } from "../src/config/env.js";
import { createDatabase } from "../src/db/database.js";
import { migrateToLatest } from "../src/db/migrate.js";
import { seedDatabase } from "../src/db/seed.js";
import type { EventRow } from "../src/db/types.js";
import { buildScoutCard, runScout, scoutPublicationDecision } from "../src/pipeline/scout.js";

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
  ] as const)("creates evidence-shaped %s opportunities", (kind) => {
    const card = buildScoutCard(event, kind);
    expect(card.hypothesis.length).toBeGreaterThan(30);
    expect(card.suggested_action).toMatch(/48 小时|工作流/);
    expect(card.artifact_idea.length).toBeGreaterThan(10);
    expect(card.counter_signals).toContain("证据");
    expect(card.total_score).toBeGreaterThan(70);
  });

  it("continues past cooled-down events and auto-publishes only viable cards", async () => {
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
    expect(second.skipped).toBeGreaterThan(0);
    expect(second.scanned).toBeGreaterThan(3);
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
});
