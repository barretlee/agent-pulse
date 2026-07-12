import { afterEach, describe, expect, it } from "vitest";
import { FetchError } from "../../src/collectors/fetcher.js";
import type { SourceAdapter } from "../../src/collectors/types.js";
import { loadConfig } from "../../src/config/env.js";
import { createDatabase } from "../../src/db/database.js";
import { migrateToLatest } from "../../src/db/migrate.js";
import { Repository } from "../../src/db/repository.js";
import { seedDatabase } from "../../src/db/seed.js";
import type { CollectedSignal } from "../../src/domain/types.js";
import { generateMonitorReport } from "../../src/pipeline/monitor.js";
import { auditSources } from "../../src/pipeline/source-audit.js";

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
  return { db, config, repository: new Repository(db) };
}

describe("source audit", () => {
  it("persists structured diagnostics without activating or writing signals", async () => {
    const { db, config, repository } = await setup();
    const source = (await repository.listSources()).find((item) => item.slug === "openai");
    expect(source).toBeTruthy();
    const beforeSignals = await db
      .selectFrom("signals")
      .select(({ fn }) => fn.countAll<number>().as("count"))
      .executeTakeFirstOrThrow();
    const beforeLifecycle = source?.lifecycle_status;
    const items = [
      signal("https://example.com/release", "Frontier model release"),
      signal("https://example.com/release", "Frontier model release"),
      signal("https://example.com/product", "New enterprise product"),
    ];
    const adapter: SourceAdapter = { kind: "fixture", collect: async () => items };

    const report = await auditSources(
      db,
      config,
      { sourceId: source?.id ?? "missing" },
      { adapterFor: () => adapter },
    );

    expect(report).toMatchObject({ total: 1, healthy: 1, withContent: 1 });
    expect(report.results[0]).toMatchObject({ itemCount: 3, duplicateRatio: 1 / 3 });
    const checks = await repository.listSourceChecks(source?.id ?? "missing");
    expect(checks).toHaveLength(1);
    expect(checks[0]).toMatchObject({
      status: "healthy",
      item_count: 3,
      duplicate_count: 1,
      policy_status: "allowed_metadata",
    });
    const monitor = await generateMonitorReport(db);
    expect(monitor).toMatchObject({
      checkedSources: 1,
      healthyCheckedSources: 1,
      skippedCheckedSources: 0,
      repairableCheckedSources: 0,
      auditHealthyPercent: 100,
      automatableHealthyPercent: 100,
    });
    const after = await repository.getSource(source?.id ?? "");
    expect(after?.lifecycle_status).toBe(beforeLifecycle);
    const afterSignals = await db
      .selectFrom("signals")
      .select(({ fn }) => fn.countAll<number>().as("count"))
      .executeTakeFirstOrThrow();
    expect(Number(afterSignals.count)).toBe(Number(beforeSignals.count));
  });

  it("records restricted sources without requesting them", async () => {
    const { db, config, repository } = await setup();
    const source = (await repository.listSources()).find((item) => item.acquisition === "social");
    expect(source).toBeTruthy();
    let adapterCalled = false;

    const report = await auditSources(
      db,
      config,
      { sourceId: source?.id ?? "missing" },
      {
        adapterFor: () => {
          adapterCalled = true;
          throw new Error("must not be called");
        },
      },
    );

    expect(adapterCalled).toBe(false);
    expect(report.results[0]).toMatchObject({
      status: "skipped",
      accessStatus: "not_checked",
      policyStatus: "restricted",
      retentionDecision: "keep_restricted",
    });
  });

  it("classifies a source failure without aborting the audit job", async () => {
    const { db, config, repository } = await setup();
    const source = (await repository.listSources()).find((item) => item.slug === "openai");
    expect(source).toBeTruthy();
    const adapter: SourceAdapter = {
      kind: "fixture",
      collect: async () => {
        throw new FetchError("connection reset", "network", true, null, "ECONNRESET");
      },
    };

    const report = await auditSources(
      db,
      config,
      { sourceId: source?.id ?? "missing" },
      { adapterFor: () => adapter },
    );

    expect(report).toMatchObject({ total: 1, failed: 1 });
    expect(report.results[0]).toMatchObject({
      errorType: "network",
      errorCode: "ECONNRESET",
      repairAction: "verify_network_dns_or_proxy",
      proxyHint: "possible",
    });
    const job = (await repository.listJobs()).find((item) => item.id === report.jobId);
    expect(job?.status).toBe("failed");
  });

  it("does not mark relative or malformed item URLs as healthy", async () => {
    const { db, config, repository } = await setup();
    const source = (await repository.listSources()).find((item) => item.slug === "openai");
    const invalid = signal("/relative-release", "Relative release link");
    const adapter: SourceAdapter = { kind: "fixture", collect: async () => [invalid] };

    const report = await auditSources(
      db,
      config,
      { sourceId: source?.id ?? "missing" },
      { adapterFor: () => adapter },
    );

    expect(report.results[0]).toMatchObject({
      status: "failed",
      schemaStatus: "invalid",
      itemCount: 0,
      errorCode: "INVALID_ITEMS",
      repairAction: "repair_item_normalization",
    });
  });

  it("records proxy fallback without storing proxy configuration", async () => {
    const { db, config, repository } = await setup();
    const source = (await repository.listSources()).find((item) => item.slug === "openai");
    const adapter: SourceAdapter = {
      kind: "fixture",
      collect: async (_descriptor, context) => {
        await context.fetchText("https://example.com/feed");
        return [signal("https://example.com/release", "Proxy-backed release")];
      },
    };
    const fetcher = async () => ({
      body: "fixture",
      status: 200,
      headers: new Headers({ "content-type": "text/plain" }),
      attemptCount: 1,
      responseBytes: 7,
      finalUrl: "https://example.com/feed",
      transport: "env-proxy" as const,
    });

    const report = await auditSources(
      db,
      config,
      { sourceId: source?.id ?? "missing" },
      { adapterFor: () => adapter, fetcher },
    );

    expect(report.results[0]).toMatchObject({ proxyUsed: true, proxyHint: "required" });
    expect((await repository.listSourceChecks(source?.id ?? "missing"))[0]).toMatchObject({
      proxy_used: 1,
      proxy_hint: "required",
    });
    expect(JSON.stringify(report)).not.toContain("HTTP_PROXY");
  });
});

function signal(url: string, title: string): CollectedSignal {
  return {
    url,
    title,
    summary:
      "A sufficiently detailed first-party summary used to validate richness and structured source diagnostics.",
    author: "Official team",
    language: "en",
    publishedAt: new Date().toISOString(),
    category: "model-release",
    tags: ["model", "release", "official"],
    metrics: {},
    rawMeta: {},
  };
}
