import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import type { Kysely } from "kysely";
import { describe, expect, it, vi } from "vitest";
import {
  databaseIsEmpty,
  type EvolutionCliOptions,
  type EvolutionServiceOverrides,
  EvolutionStopController,
  type FunnelMetrics,
  initializeEvolution,
  parseEvolutionArgs,
  runEvolutionLoop,
} from "../../src/cli/evolve.js";
import { loadConfig } from "../../src/config/env.js";
import { createDatabase } from "../../src/db/database.js";
import { migrateToLatest } from "../../src/db/migrate.js";
import type { DatabaseSchema } from "../../src/db/types.js";
import type { MonitorReport } from "../../src/pipeline/monitor.js";

const config = loadConfig({ NODE_ENV: "test", DATABASE_URL: "sqlite::memory:" });
const fakeDb = {} as Kysely<DatabaseSchema>;

const funnel: FunnelMetrics = {
  generatedAt: "2026-07-12T00:00:00.000Z",
  signals: {
    total: 12,
    clustered: 10,
    backlog: 2,
    deferred: 0,
    primary: 8,
    aggregatorDebt: 4,
    latestPublishedAt: "2026-07-11T00:00:00.000Z",
  },
  events: {
    total: 7,
    draft: 0,
    review: 2,
    published: 5,
    hidden: 0,
    ready: 1,
    blocked: 6,
    multiSource: 2,
    singleSource: 4,
    noEvidence: 1,
    placeholder: 1,
    latestHappenedAt: "2026-07-11T00:00:00.000Z",
    latestPublishedAt: "2026-07-11T00:00:00.000Z",
  },
  conversion: {
    signalToEventPercent: 58.33,
    eventToPublishedPercent: 71.43,
    multiSourcePercent: 28.57,
    readinessPercent: 14.29,
  },
  blockerCounts: { placeholder_content: 1 },
};

const monitor: MonitorReport = {
  timestamp: "2026-07-12T00:00:00.000Z",
  totalSources: 8,
  activeSources: 4,
  degradedSources: 0,
  quarantinedSources: 0,
  retiredSources: 0,
  shadowSources: 4,
  draftSources: 0,
  avgHealthScore: 90,
  sourcesNeedingAttention: [],
  coverageGaps: [],
  recommendations: [],
};

describe("evolution CLI arguments", () => {
  it("is safe and bounded by default", () => {
    const options = parseEvolutionArgs([], "/tmp/reports");

    expect(options).toMatchObject({
      once: true,
      maxIterations: 1,
      intervalMs: 1_800_000,
      reportDir: "/tmp/reports",
      saveCandidates: false,
      exportStatic: false,
    });
  });

  it("parses a bounded loop and explicit mutation options", () => {
    const options = parseEvolutionArgs([
      "--max-iterations=4",
      "--interval",
      "30s",
      "--report-dir",
      "./reports",
      "--save-candidates",
      "--export",
    ]);

    expect(options).toMatchObject({
      once: false,
      maxIterations: 4,
      intervalMs: 30_000,
      reportDir: resolve("reports"),
      saveCandidates: true,
      exportStatic: true,
    });
  });

  it("lets --once override a larger iteration limit", () => {
    expect(parseEvolutionArgs(["--max-iterations", "9", "--once"]).maxIterations).toBe(1);
  });

  it("rejects unbounded or ambiguous values", () => {
    expect(() => parseEvolutionArgs(["--max-iterations", "0"])).toThrow("positive integer");
    expect(() => parseEvolutionArgs(["--interval", "soon"])).toThrow("must use");
    expect(() => parseEvolutionArgs(["--unknown"])).toThrow("Unknown option");
  });
});

describe("evolution initialization", () => {
  it.each([
    [true, 1, "empty-database"],
    [false, 0, "existing-data"],
  ] as const)("seeds only when database empty is %s", async (empty, expectedSeeds, reason) => {
    const seed = vi.fn(async () => undefined);
    const result = await initializeEvolution(fakeDb, config, {
      migrate: async () => undefined,
      databaseIsEmpty: async () => empty,
      seed,
    });

    expect(seed).toHaveBeenCalledTimes(expectedSeeds);
    expect(result).toMatchObject({ databaseWasEmpty: empty, seeded: empty, seedReason: reason });
  });

  it("treats any existing application state as non-empty", async () => {
    const db = createDatabase(config);
    try {
      await migrateToLatest(db, config);
      expect(await databaseIsEmpty(db)).toBe(true);
      await db
        .insertInto("settings")
        .values({
          key: "owner-preference",
          value_json: "{}",
          updated_at: "2026-07-12T00:00:00.000Z",
        })
        .execute();
      expect(await databaseIsEmpty(db)).toBe(false);
    } finally {
      await db.destroy();
    }
  });
});

describe("evolution iteration", () => {
  it("runs the auditable pipeline without implicit candidate persistence or export", async () => {
    const reportDir = await mkdtemp(join(tmpdir(), "agent-pulse-evolve-"));
    const order: string[] = [];
    const saveCandidates = vi.fn(async () => ({ created: 1, skipped: 0 }));
    const exportStatic = vi.fn(async () => undefined);
    const options = makeOptions(reportDir);
    const services = makeServices(order, { saveCandidates, exportStatic });

    const reports = await runEvolutionLoop({ db: fakeDb, config, options, services });

    expect(order.slice(0, 4)).toEqual(["migrate", "empty", "collect", "cluster"]);
    expect(new Set(order.slice(4, 6))).toEqual(new Set(["readiness", "monitor"]));
    expect(order.slice(6)).toEqual(["strategy", "discover"]);
    expect(saveCandidates).not.toHaveBeenCalled();
    expect(exportStatic).not.toHaveBeenCalled();
    expect(reports).toHaveLength(1);
    expect(reports[0]).toMatchObject({
      status: "completed",
      objective: expect.any(String),
      policies: {
        automaticSourceLifecycleChanges: false,
        automaticPublication: false,
        candidatePersistence: false,
        staticExport: false,
      },
      changes: {
        signalsCreated: 3,
        eventsCreated: 1,
        signalsAttached: 2,
        candidatesSaved: 0,
      },
      funnel,
      testBoundaries: expect.arrayContaining([expect.stringContaining("不会自动激活")]),
    });
    expect(reports[0]?.problems).toEqual(
      expect.arrayContaining([
        expect.stringContaining("尚未聚类"),
        expect.stringContaining("占位"),
      ]),
    );

    const latest = JSON.parse(await readFile(join(reportDir, "latest.json"), "utf8"));
    const checkpoint = JSON.parse(await readFile(join(reportDir, "checkpoint.json"), "utf8"));
    expect(latest.iteration).toBe(1);
    expect(checkpoint).toMatchObject({ phase: "reported", status: "completed" });
    expect(checkpoint.reportPath).toMatch(/iteration-0001-/);
    expect(checkpoint.reportPath).not.toContain(reportDir);
    expect(checkpoint.reportPath).not.toMatch(/^\//);
  });

  it("persists candidates and exports only with explicit flags", async () => {
    const reportDir = await mkdtemp(join(tmpdir(), "agent-pulse-evolve-opt-in-"));
    const saveCandidates = vi.fn(async () => ({ created: 1, skipped: 0 }));
    const exportStatic = vi.fn(async () => ({ output: "dist" }));
    const options = makeOptions(reportDir, { saveCandidates: true, exportStatic: true });

    const [report] = await runEvolutionLoop({
      db: fakeDb,
      config,
      options,
      services: makeServices([], { saveCandidates, exportStatic }),
    });

    expect(saveCandidates).toHaveBeenCalledOnce();
    expect(exportStatic).toHaveBeenCalledOnce();
    expect(report?.changes).toMatchObject({ candidatesSaved: 1, staticExported: true });
  });

  it("honors interruption at a stage boundary and still writes an honest report", async () => {
    const reportDir = await mkdtemp(join(tmpdir(), "agent-pulse-evolve-stop-"));
    const stop = new EvolutionStopController();
    const cluster = vi.fn(async () => ({ created: 1, attached: 0 }));
    const services = makeServices([], {
      collect: async () => {
        stop.request("SIGINT");
        return { collected: 1, created: 1, skipped: 0, errors: [] };
      },
      cluster,
    });

    const reports = await runEvolutionLoop({
      db: fakeDb,
      config,
      options: makeOptions(reportDir, { maxIterations: 3, once: false }),
      stop,
      services,
    });

    expect(reports).toHaveLength(1);
    expect(reports[0]?.status).toBe("interrupted");
    expect(reports[0]?.funnel).toEqual(funnel);
    expect(reports[0]?.problems).toContain("收到 SIGINT，已在阶段边界安全停止。");
    expect(cluster).not.toHaveBeenCalled();
  });
});

function makeOptions(
  reportDir: string,
  overrides: Partial<EvolutionCliOptions> = {},
): EvolutionCliOptions {
  return {
    once: true,
    intervalMs: 100,
    maxIterations: 1,
    reportDir,
    saveCandidates: false,
    exportStatic: false,
    help: false,
    ...overrides,
  };
}

function makeServices(
  order: string[],
  overrides: EvolutionServiceOverrides = {},
): EvolutionServiceOverrides {
  return {
    migrate: async () => {
      order.push("migrate");
    },
    databaseIsEmpty: async () => {
      order.push("empty");
      return false;
    },
    seed: async () => {
      order.push("seed");
    },
    collect: async () => {
      order.push("collect");
      return { collected: 4, created: 3, skipped: 1, errors: [] };
    },
    cluster: async () => {
      order.push("cluster");
      return { created: 1, attached: 2 };
    },
    readiness: async () => {
      order.push("readiness");
      return funnel;
    },
    monitor: async () => {
      order.push("monitor");
      return monitor;
    },
    strategy: () => {
      order.push("strategy");
      return {
        generatedAt: "2026-07-12T00:00:00.000Z",
        version: 1,
        summary: "one action",
        actions: [
          {
            id: "action-1",
            category: "improve-quality",
            title: "补齐交叉验证",
            description: "description",
            priority: "now",
            estimatedEffort: "M",
            impactArea: "verification",
            rationale: "rationale",
            successMetric: "metric",
            dependencies: [],
          },
        ],
        metrics: {
          totalActions: 1,
          byPriority: { now: 1, next: 0, later: 0, wishlist: 0 },
          byCategory: {
            "add-source": 0,
            "fix-adapter": 0,
            "improve-quality": 1,
            "enhance-clustering": 0,
            "expand-coverage": 0,
            "optimize-performance": 0,
            "add-capability": 0,
            documentation: 0,
          },
        },
      };
    },
    discover: async () => {
      order.push("discover");
      return {
        candidates: [
          {
            slug: "candidate",
            name: "Candidate",
            homepageUrl: "https://candidate.example",
            region: "GLOBAL",
            language: "en",
            suggestedTier: 3,
            discoveryReason: "two references",
            evidenceUrls: ["https://example.com/1"],
            signalCount: 2,
            uniqueEvidenceCount: 2,
            aggregatorCount: 2,
            originalTitles: ["Candidate signal"],
            score: 80,
            confidence: "high" as const,
            origins: [],
          },
        ],
        existingSourceMatches: 0,
        newCandidates: 1,
        skippedExisting: 0,
        policyRejected: 0,
        duplicateEvidence: 0,
      };
    },
    saveCandidates: async () => ({ created: 0, skipped: 0 }),
    exportStatic: async () => undefined,
    now: () => new Date("2026-07-12T00:00:00.000Z"),
    ...overrides,
  };
}
