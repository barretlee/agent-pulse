import { afterEach, describe, expect, it } from "vitest";
import { historicalEvents } from "../src/catalog/history.js";
import { recentDensityEvents } from "../src/catalog/recent-density.js";
import { loadConfig } from "../src/config/env.js";
import { createDatabase } from "../src/db/database.js";
import { migrateToLatest } from "../src/db/migrate.js";
import { Repository } from "../src/db/repository.js";
import { seedDatabase } from "../src/db/seed.js";
import { clusterSignals } from "../src/pipeline/cluster.js";
import { evaluateEventReadiness, eventReadinessSummary } from "../src/pipeline/readiness.js";

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

describe("event publication readiness", () => {
  it("accepts a curated first-party milestone and labels its evidence level", async () => {
    const { db, repository } = await setup();
    const event = (await repository.listEvents("published")).find(
      (item) => item.slug === "openai-o1-test-time-reasoning",
    );
    expect(event).toBeTruthy();

    const readiness = await evaluateEventReadiness(db, event?.id ?? "missing");

    expect(readiness).toMatchObject({
      status: "ready",
      blockers: [],
      evidenceLevel: "single-primary",
      independentSources: 1,
      primaryEvidence: 1,
    });
    expect(readiness.warnings).toContain("single-source fact; cross-source corroboration pending");
  });

  it("blocks placeholder clusters from publication", async () => {
    const { db, repository } = await setup();
    const source = (await repository.listSources()).find((item) => item.slug === "openai");
    expect(source).toBeTruthy();
    await repository.insertSignal(source?.id ?? "missing", {
      url: "https://openai.com/index/fixture-readiness-event/",
      title: "Fixture product announcement",
      summary: "A source signal that is intentionally clustered into an unedited review event.",
      author: "OpenAI",
      language: "en",
      publishedAt: "2026-07-12T00:00:00.000Z",
      category: "industry",
      tags: [],
      metrics: {},
      rawMeta: {},
    });
    await clusterSignals(db);
    const event = (await repository.listEvents("review")).find((item) =>
      item.title.includes("Fixture product announcement"),
    );

    const readiness = await evaluateEventReadiness(db, event?.id ?? "missing");

    expect(readiness.status).toBe("blocked");
    expect(readiness.blockers).toEqual(
      expect.arrayContaining([
        "placeholder_content",
        "generic_entity",
        "missing_category",
        "missing_track",
      ]),
    );
  });

  it("does not allow a high heat label without cross-source and cross-platform factors", async () => {
    const { db, repository } = await setup();
    const event = (await repository.listEvents("published")).find(
      (item) => item.slug === "openai-o1-test-time-reasoning",
    );

    const readiness = await evaluateEventReadiness(db, event?.id ?? "missing", {
      heat_score: 90,
      score_factors_json: JSON.stringify({ independentSources: 1, platformBreadth: 1 }),
    });

    expect(readiness.status).toBe("blocked");
    expect(readiness.blockers).toContain("unsupported_heat");
  });

  it("blocks research events that do not explain method, impact, and what to verify next", async () => {
    const { db, repository } = await setup();
    const event = (await repository.listEvents("published")).find(
      (item) => item.slug === "openai-o1-test-time-reasoning",
    );

    const readiness = await evaluateEventReadiness(db, event?.id ?? "missing", {
      category: "research",
      technical_insight: "Only a result headline.",
      industry_insight: "Too little context.",
      future_outlook: "Wait.",
    });

    expect(readiness.status).toBe("blocked");
    expect(readiness.blockers).toContain("thin_research_analysis");
  });

  it("accepts concise research analysis above the reduced depth floor", async () => {
    const { db, repository } = await setup();
    const event = (await repository.listEvents("published")).find(
      (item) => item.slug === "openai-o1-test-time-reasoning",
    );
    const technical =
      "The method compares controlled reasoning budgets across reproducible task variants.";
    const industry = "This changes how teams compare model reliability and total task cost.";
    const future = "Reproduce the result on private workloads and newer model versions.";
    expect(technical.length).toBeGreaterThanOrEqual(56);
    expect(industry.length).toBeGreaterThanOrEqual(36);
    expect(future.length).toBeGreaterThanOrEqual(28);

    const readiness = await evaluateEventReadiness(db, event?.id ?? "missing", {
      category: "research",
      technical_insight: technical,
      industry_insight: industry,
      future_outlook: future,
    });

    expect(readiness.status).toBe("ready");
    expect(readiness.blockers).not.toContain("thin_research_analysis");
  });

  it("summarizes blockers across the editorial backlog", async () => {
    const { db } = await setup();
    const summary = await eventReadinessSummary(db);
    expect(summary.total).toBe(historicalEvents.length + recentDensityEvents.length + 6);
    expect(summary.ready).toBeGreaterThan(0);
    expect(summary.ready + summary.blocked).toBe(summary.total);
  });
});
