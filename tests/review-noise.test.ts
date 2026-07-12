import { randomUUID } from "node:crypto";
import { afterEach, describe, expect, it } from "vitest";
import { loadConfig } from "../src/config/env.js";
import { createDatabase } from "../src/db/database.js";
import { migrateToLatest } from "../src/db/migrate.js";
import { Repository } from "../src/db/repository.js";
import { seedDatabase } from "../src/db/seed.js";
import { findReviewNoiseCandidates, reconcileReviewNoise } from "../src/pipeline/review-noise.js";

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
  return { db, repository: new Repository(db) };
}

describe("review noise reconciliation", () => {
  it("suppresses a reversible single-source placeholder while retaining its signal", async () => {
    const { db, repository } = await setup();
    const source = (await repository.listSources()).find((item) => item.slug === "techcrunch-ai");
    const signal = await repository.insertSignal(source?.id ?? "missing", {
      url: "https://techcrunch.com/fixture/legacy-noise",
      title: "General AI market commentary",
      summary:
        "A legacy media item that should remain searchable without becoming a timeline event.",
      language: "en",
      publishedAt: "2026-07-12T00:00:00.000Z",
      category: "industry",
      tags: [],
      metrics: {},
      rawMeta: {},
    });
    const eventId = randomUUID();
    const timestamp = new Date().toISOString();
    await db
      .insertInto("events")
      .values({
        id: eventId,
        slug: "legacy-noise-fixture",
        title: signal?.title ?? "Legacy noise",
        fact_summary: signal?.summary ?? "Legacy summary",
        summary: signal?.summary ?? "Legacy summary",
        technical_insight: "待编辑：技术判断",
        industry_insight: "待编辑：行业判断",
        future_outlook: "待编辑：未来判断",
        business_value: "待编辑：业务判断",
        category: "industry",
        company: "industry",
        keywords_json: "[]",
        confidence_score: 0,
        heat_score: 0,
        impact_score: 50,
        value_score: 0,
        score_factors_json: "{}",
        status: "review",
        featured: 0,
        manual_override: 0,
        happened_at: "2026-07-12T00:00:00.000Z",
        published_at: null,
        created_at: timestamp,
        updated_at: timestamp,
      })
      .execute();
    await repository.attachSignal(eventId, signal?.id ?? "missing", "supporting", 20);

    expect((await findReviewNoiseCandidates(db)).map((item) => item.eventId)).toContain(eventId);
    await expect(reconcileReviewNoise(db)).resolves.toMatchObject({ suppressed: 1 });
    expect(
      await db.selectFrom("events").select("id").where("id", "=", eventId).executeTakeFirst(),
    ).toBeUndefined();
    expect(
      await db
        .selectFrom("signals")
        .select("id")
        .where("id", "=", signal?.id ?? "missing")
        .executeTakeFirst(),
    ).toBeTruthy();
    const triage = await db
      .selectFrom("signal_triage")
      .selectAll()
      .where("signal_id", "=", signal?.id ?? "missing")
      .executeTakeFirstOrThrow();
    expect(triage.reason).toBe("low_eventability_review_suppressed");
    expect(JSON.parse(triage.details_json)).toMatchObject({
      reversible: true,
      suppressedEvent: { id: eventId },
    });
  });
});
