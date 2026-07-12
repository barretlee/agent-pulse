import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { loadConfig } from "../src/config/env.js";
import { createDatabase } from "../src/db/database.js";
import { migrateToLatest } from "../src/db/migrate.js";
import { Repository } from "../src/db/repository.js";
import { seedDatabase } from "../src/db/seed.js";
import { restoreRepositorySnapshot, writeRepositorySnapshot } from "../src/pipeline/snapshot.js";

const databases: ReturnType<typeof createDatabase>[] = [];

afterEach(async () => {
  while (databases.length) await databases.pop()?.destroy();
});

describe("repository data snapshot", () => {
  it("is deterministic, strips sensitive URL parameters and restores into a fresh database", async () => {
    const config = loadConfig({ NODE_ENV: "test", DATABASE_URL: "sqlite::memory:" });
    const sourceDb = createDatabase(config);
    databases.push(sourceDb);
    await migrateToLatest(sourceDb, config);
    await seedDatabase(sourceDb);
    const repository = new Repository(sourceDb);
    const openai = (await repository.listSources()).find((source) => source.slug === "openai");
    expect(openai).toBeDefined();
    const jobId = await repository.startJob("collect", openai?.id ?? null);
    const runId = await repository.startSourceRun(openai?.id ?? "", jobId);
    await repository.finishSourceRun(runId, {
      status: "succeeded",
      attemptCount: 1,
      durationMs: 100,
      collected: 10,
      created: 8,
      skipped: 2,
      httpStatus: 200,
      responseBytes: 1_024,
    });
    await repository.finishJob(jobId, { collected: 10, created: 8, skipped: 2, errors: [] });
    await repository.insertSourceCheck({
      id: "snapshot-source-check",
      source_id: openai?.id ?? "",
      job_id: null,
      status: "healthy",
      adapter: "rss",
      adapter_version: "1",
      access_status: "reachable",
      fetch_status: "succeeded",
      parse_status: "succeeded",
      schema_status: "valid",
      policy_status: "allowed_metadata",
      http_status: 200,
      final_url: "https://openai.com/feed.xml?api_key=must-not-leak",
      content_type: "application/atom+xml",
      response_bytes: 1_024,
      item_count: 10,
      duplicate_count: 1,
      duplicate_ratio_bps: 1_000,
      quality_score: 80,
      latest_item_at: "2026-07-11T08:00:00.000Z",
      freshness_hours: 12,
      error_type: null,
      error_code: null,
      error_summary: null,
      repair_action: "none",
      proxy_hint: "not_required",
      proxy_used: 0,
      retention_decision: "keep",
      recommended_lifecycle: "active",
      sample_json: JSON.stringify({ secret: "must-not-leak" }),
      started_at: "2026-07-11T08:00:00.000Z",
      finished_at: "2026-07-11T08:00:01.000Z",
      duration_ms: 1_000,
    });
    const snapshotSignal = await repository.insertSignal(openai?.id ?? "", {
      externalId: "snapshot-sensitive-url",
      url: "https://openai.com/index/snapshot-test?api_key=must-not-leak&utm_source=test",
      title: "Snapshot persistence test signal",
      summary: `A stable signal used to validate repository snapshot restore from /Users/alice/private/workspace. ${"context ".repeat(400)}`,
      language: "en",
      publishedAt: "2026-07-11T08:00:00.000Z",
      category: "test",
      tags: ["snapshot"],
      metrics: { platforms: ["official"] },
      rawMeta: { ignored: true },
    });
    await repository.deferSignal(snapshotSignal?.id ?? "", "snapshot-triage-fixture", 42, {
      reversible: true,
    });

    const root = await mkdtemp(join(tmpdir(), "agent-pulse-snapshot-"));
    const first = await writeRepositorySnapshot(sourceDb, root);
    const second = await writeRepositorySnapshot(sourceDb, root);
    expect(first.changed).toBe(true);
    expect(second).toMatchObject({ changed: false, sha256: first.sha256 });
    const serialized = await readFile(join(root, "data/snapshot/v1.json"), "utf8");
    expect(serialized).not.toContain("must-not-leak");
    expect(serialized).not.toContain("raw_meta_json");
    expect(serialized).not.toContain("/Users/");
    expect(serialized).toContain("[local-path]");
    const snapshot = JSON.parse(serialized);
    const persisted = snapshot.signals.find(
      (signal: { title: string }) => signal.title === "Snapshot persistence test signal",
    );
    expect(persisted.summary.length).toBeLessThanOrEqual(320);
    expect(first.counts.signalTriage).toBe(1);
    expect(first.counts.sourceChecks).toBe(1);
    expect(first.counts.sourceRuns).toBe(1);
    expect(first.counts.scoutInsights).toBe(1);

    const targetDb = createDatabase(config);
    databases.push(targetDb);
    await migrateToLatest(targetDb, config);
    await seedDatabase(targetDb);
    const targetRepository = new Repository(targetDb);
    const targetOpenai = (await targetRepository.listSources()).find(
      (source) => source.slug === "openai",
    );
    const catalogSignal = await targetRepository.insertSignal(targetOpenai?.id ?? "", {
      externalId: "new-catalog-signal",
      url: "https://openai.com/index/new-catalog-signal",
      title: "New catalog signal added after the snapshot",
      summary: "Restore must merge rather than delete newer catalog evidence.",
      language: "en",
      publishedAt: "2026-07-12T08:00:00.000Z",
      category: "test",
      tags: ["catalog"],
      metrics: {},
      rawMeta: {},
    });
    const catalogEvent = (await targetRepository.listEvents())[0];
    expect(catalogEvent).toBeDefined();
    await targetRepository.attachSignal(
      catalogEvent?.id ?? "",
      catalogSignal?.id ?? "",
      "primary",
      100,
    );
    const restored = await restoreRepositorySnapshot(targetDb, root);
    expect(restored).toMatchObject({ restored: true, counts: first.counts });
    const restoredSignal = await targetDb
      .selectFrom("signals")
      .selectAll()
      .where("title", "=", "Snapshot persistence test signal")
      .executeTakeFirst();
    expect(restoredSignal?.canonical_url).toBe("https://openai.com/index/snapshot-test");
    expect(restoredSignal?.raw_meta_json).toBe("{}");
    expect(
      await targetDb
        .selectFrom("signal_triage")
        .select(["reason", "eventability_score"])
        .where("signal_id", "=", restoredSignal?.id ?? "")
        .executeTakeFirst(),
    ).toEqual({ reason: "snapshot-triage-fixture", eventability_score: 42 });
    expect(
      await targetDb
        .selectFrom("event_signals")
        .select("signal_id")
        .where("signal_id", "=", catalogSignal?.id ?? "")
        .executeTakeFirst(),
    ).toBeDefined();
    expect(
      await targetDb
        .selectFrom("source_checks")
        .select(["status", "final_url", "sample_json"])
        .where("id", "=", "snapshot-source-check")
        .executeTakeFirst(),
    ).toEqual({
      status: "healthy",
      final_url: "https://openai.com/feed.xml",
      sample_json: "{}",
    });
    expect(
      await targetDb
        .selectFrom("source_runs")
        .select(["status", "collected_count", "created_count"])
        .where("id", "=", runId)
        .executeTakeFirst(),
    ).toEqual({ status: "succeeded", collected_count: 10, created_count: 8 });
    expect(await targetRepository.publicScoutInsights()).toHaveLength(1);
  });
});
