import { afterEach, describe, expect, it } from "vitest";
import { loadConfig } from "../src/config/env.js";
import { createDatabase } from "../src/db/database.js";
import { migrateToLatest } from "../src/db/migrate.js";
import { seedDatabase } from "../src/db/seed.js";
import { generatePipelineFunnel } from "../src/pipeline/funnel.js";

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

describe("pipeline funnel", () => {
  it("reports a coherent signal-to-publication snapshot", async () => {
    const report = await generatePipelineFunnel(await setup());

    expect(report.signals.total).toBeGreaterThan(0);
    expect(report.signals.clustered + report.signals.backlog + report.signals.deferred).toBe(
      report.signals.total,
    );
    expect(report.signals.primary + report.signals.aggregatorDebt).toBe(report.signals.total);
    expect(report.events.total).toBe(
      report.events.draft + report.events.review + report.events.published + report.events.hidden,
    );
    expect(report.events.multiSource + report.events.singleSource + report.events.noEvidence).toBe(
      report.events.total,
    );
    expect(report.events.ready + report.events.blocked).toBe(report.events.total);
    expect(report.conversion.eventToPublishedPercent).toBeGreaterThan(0);
  });

  it("exposes publication blockers instead of hiding editorial debt", async () => {
    const db = await setup();
    const event = await db.selectFrom("events").select("id").limit(1).executeTakeFirstOrThrow();
    await db
      .updateTable("events")
      .set({ summary: "待编辑", fact_summary: "待编辑" })
      .where("id", "=", event.id)
      .execute();

    const report = await generatePipelineFunnel(db);

    expect(report.events.placeholder).toBeGreaterThan(0);
    expect(report.blockerCounts.placeholder_content).toBeGreaterThan(0);
  });
});
