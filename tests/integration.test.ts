import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { historicalEvents } from "../src/catalog/history.js";
import { sourceCatalog } from "../src/catalog/sources.js";
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
    const sourceBySlug = await repository.getSourceByIdOrSlug(sourceCatalog[0]?.slug ?? "missing");
    expect(sourceBySlug?.slug).toBe(sourceCatalog[0]?.slug);
    expect((await repository.getSourceByIdOrSlug(sourceBySlug?.id ?? "missing"))?.id).toBe(
      sourceBySlug?.id,
    );
    expect((await repository.publicEvents()).length).toBeGreaterThanOrEqual(6);
    const result = await exportStaticSite(db, config);
    expect(result).toMatchObject({
      events: historicalEvents.length + 6,
      tracks: 10,
      sources: sourceCatalog.length,
      version: "0.5.0",
    });
    const timeline = await readFile(join(config.distDir, "data/timeline.json"), "utf8");
    expect(timeline).not.toContain("ADMIN_TOKEN");
    expect(timeline).not.toContain("/Users/");
    expect(JSON.parse(timeline).events[0]).not.toHaveProperty("manual_override");
    const scout = JSON.parse(await readFile(join(config.distDir, "data/scout.json"), "utf8"));
    expect(scout.insights).toHaveLength(1);
    expect(scout.insights[0]).not.toHaveProperty("cooldown_key");
    expect(scout.insights[0].evidence[0].slug).toBe("lingbot-vla-2-cross-embodiment");
    const product = JSON.parse(await readFile(join(config.distDir, "data/product.json"), "utf8"));
    expect(product.roadmap).toHaveLength(5);
    expect(product.sourceCoverage.total).toBeGreaterThanOrEqual(100);
    expect(product.sourceCoverage.observing).toBe(0);
    expect(product.evaluation).toMatchObject({
      rawWeightedScore: expect.any(Number),
      evidenceCoverage: expect.any(Number),
    });
    expect(product.evaluation.dimensions).toHaveLength(10);
    expect(product.evaluation.status).toBe("partial");
    expect(product.evaluation.overallScore).toBeLessThan(50);
    expect(
      product.evaluation.dimensions.every(
        (item: { sampleTarget: number }) => item.sampleTarget > 0,
      ),
    ).toBe(true);
    expect(
      product.evaluation.dimensions
        .filter((item: { status: string }) => item.status === "insufficient_data")
        .every(
          (item: { score: number; scoreCap: number }) =>
            item.score <= 45 && item.score <= item.scoreCap,
        ),
    ).toBe(true);
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
    const evaluation = await app.inject({
      method: "POST",
      url: "/api/admin/pipeline/evaluate",
      headers: { authorization: "Bearer a-secure-token-for-tests" },
    });
    expect(evaluation.statusCode).toBe(200);
    expect(evaluation.json().dimensions).toHaveLength(10);
    const funnel = await app.inject({
      method: "GET",
      url: "/api/admin/pipeline/funnel",
      headers: { authorization: "Bearer a-secure-token-for-tests" },
    });
    expect(funnel.statusCode).toBe(200);
    expect(funnel.json()).toMatchObject({
      signals: { backlog: expect.any(Number), deferred: expect.any(Number) },
      events: { ready: expect.any(Number), blocked: expect.any(Number) },
    });
    for (const url of [
      "/api/admin/source-checks",
      "/api/admin/event-readiness",
      "/api/admin/event-merge-candidates",
    ]) {
      const response = await app.inject({
        method: "GET",
        url,
        headers: { authorization: "Bearer a-secure-token-for-tests" },
      });
      expect(response.statusCode, url).toBe(200);
    }
    const shadowSource = (await new Repository(db).listSources()).find(
      (source) => source.lifecycle_status === "shadow" && source.acquisition === "rss",
    );
    const prematureObservation = await app.inject({
      method: "POST",
      url: `/api/admin/sources/${shadowSource?.id}/observation`,
      headers: { authorization: "Bearer a-secure-token-for-tests" },
      payload: { enabled: true },
    });
    expect(prematureObservation.statusCode).toBe(409);
    expect(prematureObservation.json().error).toContain("not eligible");
    await app.close();
  });

  it("refreshes catalog metadata without resetting source runtime state", async () => {
    const config = loadConfig({ NODE_ENV: "test", DATABASE_URL: "sqlite::memory:" });
    const db = createDatabase(config);
    databases.push(db);
    await migrateToLatest(db, config);
    await seedDatabase(db);
    const repository = new Repository(db);
    const source = (await repository.listSources()).find((item) => item.slug === "openai");
    expect(source).toBeTruthy();
    await repository.updateSource(source?.id ?? "missing", {
      lifecycle_status: "degraded",
      enabled: 1,
      health_score: 42,
      consecutive_failures: 3,
      state_json: JSON.stringify({ etag: "runtime-state" }),
      last_success_at: "2026-07-12T00:00:00.000Z",
      last_error: "transient",
    });

    await seedDatabase(db);

    const preserved = await repository.getSource(source?.id ?? "missing");
    expect(preserved).toMatchObject({
      lifecycle_status: "degraded",
      enabled: 1,
      health_score: 42,
      consecutive_failures: 3,
      last_success_at: "2026-07-12T00:00:00.000Z",
      last_error: "transient",
    });
    expect(JSON.parse(preserved?.state_json ?? "{}")).toEqual({ etag: "runtime-state" });
  });
});
