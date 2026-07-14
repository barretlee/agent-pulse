import BetterSqlite3 from "better-sqlite3";
import { Kysely, SqliteDialect } from "kysely";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Repository } from "../../src/db/repository.js";
import type { DatabaseSchema } from "../../src/db/types.js";
import {
  applyAdaptiveHealth,
  generateMonitorReport,
  sourceLifecyclePercentages,
} from "../../src/pipeline/monitor.js";

let db: Kysely<DatabaseSchema>;

beforeAll(async () => {
  const sqlite = new BetterSqlite3(":memory:");
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");
  db = new Kysely<DatabaseSchema>({ dialect: new SqliteDialect({ database: sqlite }) });

  // Create minimal schema
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS sources (
      id TEXT PRIMARY KEY, slug TEXT NOT NULL, name TEXT NOT NULL,
      homepage_url TEXT NOT NULL, adapter TEXT NOT NULL DEFAULT 'rss',
      tier INTEGER NOT NULL DEFAULT 2, role TEXT NOT NULL DEFAULT 'media',
      region TEXT NOT NULL DEFAULT 'GLOBAL', language TEXT NOT NULL DEFAULT 'en',
      authority_score INTEGER NOT NULL DEFAULT 70,
      enabled INTEGER NOT NULL DEFAULT 0, config_json TEXT NOT NULL DEFAULT '{}',
      state_json TEXT NOT NULL DEFAULT '{}',
      last_collected_at TEXT, last_success_at TEXT, last_error TEXT,
      lifecycle_status TEXT NOT NULL DEFAULT 'shadow',
      health_score INTEGER NOT NULL DEFAULT 100,
      consecutive_failures INTEGER NOT NULL DEFAULT 0,
      success_count INTEGER NOT NULL DEFAULT 0,
      failure_count INTEGER NOT NULL DEFAULT 0,
      priority INTEGER NOT NULL DEFAULT 0,
      timeout_ms INTEGER NOT NULL DEFAULT 30000,
      max_retries INTEGER NOT NULL DEFAULT 2,
      base_backoff_ms INTEGER NOT NULL DEFAULT 500,
      rate_limit_per_minute INTEGER NOT NULL DEFAULT 60,
      next_run_at TEXT, retired_at TEXT,
      source_category TEXT NOT NULL DEFAULT 'media',
      acquisition TEXT NOT NULL DEFAULT 'rss',
      topics_json TEXT NOT NULL DEFAULT '[]',
      maintenance_status TEXT NOT NULL DEFAULT 'candidate',
      cadence TEXT NOT NULL DEFAULT '24h',
      license_note TEXT NOT NULL DEFAULT '',
      quality_score INTEGER NOT NULL DEFAULT 50,
      last_verified_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS source_checks (
      id TEXT PRIMARY KEY, source_id TEXT NOT NULL, job_id TEXT,
      status TEXT NOT NULL, adapter TEXT NOT NULL, adapter_version TEXT NOT NULL,
      access_status TEXT NOT NULL, fetch_status TEXT NOT NULL,
      parse_status TEXT NOT NULL, schema_status TEXT NOT NULL, policy_status TEXT NOT NULL,
      http_status INTEGER, final_url TEXT, content_type TEXT, response_bytes INTEGER NOT NULL,
      item_count INTEGER NOT NULL, duplicate_count INTEGER NOT NULL,
      duplicate_ratio_bps INTEGER NOT NULL, quality_score INTEGER NOT NULL,
      latest_item_at TEXT, freshness_hours INTEGER, error_type TEXT, error_code TEXT,
      error_summary TEXT, repair_action TEXT NOT NULL, proxy_hint TEXT NOT NULL,
      retention_decision TEXT NOT NULL, recommended_lifecycle TEXT NOT NULL,
      sample_json TEXT NOT NULL, started_at TEXT NOT NULL, finished_at TEXT NOT NULL,
      duration_ms INTEGER NOT NULL,
      FOREIGN KEY (source_id) REFERENCES sources(id) ON DELETE CASCADE
    )
  `);
});

afterAll(async () => {
  await db.destroy();
});

async function seedTestSources(repo: Repository): Promise<void> {
  const now = new Date().toISOString();
  const sources = [
    {
      slug: "active-1",
      lifecycle: "active",
      health: 95,
      failures: 0,
      region: "GLOBAL",
      language: "en",
      category: "frontier-lab",
      enabled: 1,
    },
    {
      slug: "active-2",
      lifecycle: "active",
      health: 88,
      failures: 0,
      region: "CN",
      language: "zh-CN",
      category: "china-lab",
      enabled: 1,
    },
    {
      slug: "degraded-1",
      lifecycle: "degraded",
      health: 55,
      failures: 3,
      region: "GLOBAL",
      language: "en",
      category: "media",
      enabled: 1,
    },
    {
      slug: "quarantined-1",
      lifecycle: "quarantined",
      health: 20,
      failures: 7,
      region: "GLOBAL",
      language: "en",
      category: "expert",
      enabled: 0,
    },
    {
      slug: "shadow-1",
      lifecycle: "shadow",
      health: 100,
      failures: 0,
      region: "CN",
      language: "zh-CN",
      category: "policy",
      enabled: 0,
    },
    {
      slug: "shadow-2",
      lifecycle: "shadow",
      health: 100,
      failures: 0,
      region: "CN",
      language: "zh-CN",
      category: "capital-business",
      enabled: 0,
    },
    {
      slug: "retired-1",
      lifecycle: "retired",
      health: 0,
      failures: 10,
      region: "GLOBAL",
      language: "en",
      category: "media",
      enabled: 0,
    },
  ];

  for (const s of sources) {
    await repo.saveSource({
      id: `test-${s.slug}`,
      slug: s.slug,
      name: s.slug,
      homepage_url: `https://${s.slug}.example.com`,
      adapter: "rss",
      tier: 2,
      role: "media",
      region: s.region,
      language: s.language,
      authority_score: 70,
      enabled: s.enabled,
      config_json: JSON.stringify({ url: `https://${s.slug}.example.com/feed` }),
      state_json: "{}",
      lifecycle_status: s.lifecycle,
      source_category: s.category,
      acquisition: "rss",
      topics_json: JSON.stringify([s.category]),
      maintenance_status: s.lifecycle === "shadow" ? "candidate" : "ready",
      cadence: "24h",
      license_note: "",
      quality_score: 50,
      health_score: s.health,
      consecutive_failures: s.failures,
      last_verified_at: now,
    });
  }
}

describe("generateMonitorReport", () => {
  it("returns correct lifecycle distribution", async () => {
    const repo = new Repository(db);
    await seedTestSources(repo);

    const report = await generateMonitorReport(db);

    expect(report.totalSources).toBe(7);
    expect(report.activeSources).toBe(2);
    expect(report.degradedSources).toBe(1);
    expect(report.quarantinedSources).toBe(1);
    expect(report.shadowSources).toBe(2);
    expect(report.retiredSources).toBe(1);
  });

  it("identifies sources needing attention", async () => {
    const report = await generateMonitorReport(db);

    const attentionSlugs = report.sourcesNeedingAttention.map((s) => s.slug);
    expect(attentionSlugs).toContain("degraded-1");
    expect(attentionSlugs).toContain("quarantined-1");
  });

  it("detects coverage gaps", async () => {
    const report = await generateMonitorReport(db);

    const cnGap = report.coverageGaps.find((g) => g.dimension === "cn-sources");
    expect(cnGap).toBeDefined();
    expect(cnGap).toMatchObject({ current: 0, catalogCurrent: 3, severity: "critical" });
  });

  it("generates recommendations", async () => {
    const report = await generateMonitorReport(db);
    expect(report.recommendations.length).toBeGreaterThan(0);
  });
});

describe("sourceLifecyclePercentages", () => {
  it("never subtracts mutually exclusive active and degraded lifecycles", () => {
    expect(
      sourceLifecyclePercentages({
        totalSources: 411,
        activeSources: 5,
        degradedSources: 12,
        quarantinedSources: 62,
        retiredSources: 0,
        shadowSources: 332,
        draftSources: 0,
      }),
    ).toEqual({ activePercent: 6, degradedPercent: 15, failedPercent: 78 });
  });

  it("returns zero percentages when there are no effective production sources", () => {
    expect(
      sourceLifecyclePercentages({
        totalSources: 10,
        activeSources: 0,
        degradedSources: 0,
        quarantinedSources: 0,
        retiredSources: 0,
        shadowSources: 8,
        draftSources: 2,
      }),
    ).toEqual({ activePercent: 0, degradedPercent: 0, failedPercent: 0 });
  });
});

describe("applyAdaptiveHealth", () => {
  it("degrade source with 2+ consecutive failures", async () => {
    const repo = new Repository(db);
    await repo.updateSource("test-active-1", {
      lifecycle_status: "active",
      consecutive_failures: 3,
    });

    const result = await applyAdaptiveHealth(db);

    expect(result.degraded).toBe(1);
  });

  it("quarantines source with 5+ consecutive failures in degraded state", async () => {
    const repo = new Repository(db);
    await repo.updateSource("test-active-2", {
      lifecycle_status: "degraded",
      consecutive_failures: 6,
    });

    const result = await applyAdaptiveHealth(db);
    expect(result.quarantined).toBe(1);
  });
});
