/**
 * Monitor Check — CI-friendly health probe for Agent Pulse.
 *
 * Checks:
 *   1. Site availability (HTTP GET PUBLIC_SITE_URL)
 *   2. Data freshness (age of data/snapshot/v1.json)
 *   3. Source health (DB query via generateMonitorReport)
 *
 * Exit codes:
 *   0 = all OK
 *   1 = warnings (non-critical degradation)
 *   2 = critical issues (site down, systemic failures)
 *
 * Usage:
 *   npm run monitor:check
 *   npm run monitor:check -- --json     # force JSON to stdout (default in CI)
 *   MONITOR_SKIP_SITE=1 npm run monitor:check   # skip site check
 */

import { stat } from "node:fs/promises";
import { loadConfig } from "../config/env.js";
import { createDatabase } from "../db/database.js";
import { migrateToLatest } from "../db/migrate.js";
import { seedDatabase } from "../db/seed.js";
import {
  generateMonitorReport,
  getSeverityLevel,
  sourceLifecyclePercentages,
} from "../pipeline/monitor.js";
import { restoreRepositorySnapshot } from "../pipeline/snapshot.js";

// ─── Types ────────────────────────────────────────────────────────────────

interface CheckDetail {
  status: "ok" | "warning" | "critical";
  message: string;
  detail: Record<string, unknown>;
}

interface HealthCheckDetail extends CheckDetail {
  totalSources: number;
  healthyPercent: number;
  degradedPercent: number;
  failedPercent: number;
  avgHealthScore: number;
}

export interface MonitorCheckResult {
  timestamp: string;
  status: "ok" | "warning" | "critical";
  systemScore: number;
  checks: {
    site: CheckDetail;
    freshness: CheckDetail;
    sourceHealth: HealthCheckDetail;
  };
  issues: string[];
  recommendations: string[];
}

// ─── Snapshot path ────────────────────────────────────────────────────────

const SNAPSHOT_PATH = "data/snapshot/v1.json";
const FRESHNESS_WARNING_MIN = 6 * 60; // 6 hours
const FRESHNESS_CRITICAL_MIN = 24 * 60; // 24 hours

// ─── Checks ───────────────────────────────────────────────────────────────

async function checkSite(config: ReturnType<typeof loadConfig>): Promise<CheckDetail> {
  const url = config.PUBLIC_SITE_URL;
  try {
    const response = await fetch(url, {
      method: "GET",
      headers: { "User-Agent": "agent-pulse-monitor/1.0" },
      signal: AbortSignal.timeout(15_000),
    });
    if (response.status === 200) {
      return {
        status: "ok",
        message: `Site is reachable at ${url}`,
        detail: { url, httpStatus: response.status },
      };
    }
    return {
      status: "critical",
      message: `Site returned HTTP ${response.status} for ${url}`,
      detail: { url, httpStatus: response.status },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      status: "critical",
      message: `Site unreachable: ${message}`,
      detail: { url, error: message },
    };
  }
}

async function checkFreshness(rootDir: string): Promise<CheckDetail> {
  try {
    const filePath = new URL(SNAPSHOT_PATH, `file://${rootDir}/`).pathname;
    const fileStat = await stat(filePath);
    const now = Date.now();
    const ageMs = now - fileStat.mtimeMs;
    const ageMinutes = Math.round(ageMs / 60_000);

    if (ageMinutes < FRESHNESS_WARNING_MIN) {
      return {
        status: "ok",
        message: `Snapshot is ${ageMinutes} minutes old (threshold: ${FRESHNESS_WARNING_MIN} min)`,
        detail: { ageMinutes, lastModified: fileStat.mtime.toISOString() },
      };
    }
    if (ageMinutes < FRESHNESS_CRITICAL_MIN) {
      return {
        status: "warning",
        message: `Snapshot is ${ageMinutes} minutes old — data may be stale`,
        detail: { ageMinutes, lastModified: fileStat.mtime.toISOString() },
      };
    }
    return {
      status: "critical",
      message: `Snapshot is ${ageMinutes} minutes old — data is critically stale`,
      detail: { ageMinutes, lastModified: fileStat.mtime.toISOString() },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      status: "critical",
      message: `Cannot read snapshot: ${message}`,
      detail: { error: message },
    };
  }
}

async function checkSourceHealth(
  config: ReturnType<typeof loadConfig>,
): Promise<HealthCheckDetail> {
  const db = createDatabase(config);
  try {
    await migrateToLatest(db, config);

    // Ensure there's data in the DB — seed + restore if empty
    const count = await db
      .selectFrom("sources")
      .select(({ fn }) => fn.countAll<number>().as("count"))
      .executeTakeFirstOrThrow();
    if (Number(count.count) === 0) {
      await seedDatabase(db);
      await restoreRepositorySnapshot(db, config.rootDir);
    }

    const report = await generateMonitorReport(db);
    const { activePercent, degradedPercent, failedPercent } = sourceLifecyclePercentages(report);

    const severity = getSeverityLevel(report);

    return {
      status: severity,
      message: `Production lifecycle: ${activePercent}% active; latest audit: ${report.auditHealthyPercent ?? "N/A"}% healthy (avg observed score ${report.avgHealthScore}/100)`,
      detail: {
        totalSources: report.totalSources,
        activeSources: report.activeSources,
        degradedSources: report.degradedSources,
        quarantinedSources: report.quarantinedSources,
        retiredSources: report.retiredSources,
        shadowSources: report.shadowSources,
        draftSources: report.draftSources,
        avgHealthScore: report.avgHealthScore,
        healthyCheckedSources: report.healthyCheckedSources,
        repairableCheckedSources: report.repairableCheckedSources,
        auditHealthyPercent: report.auditHealthyPercent,
        needsAttentionCount: report.sourcesNeedingAttention.length,
      },
      totalSources: report.totalSources,
      healthyPercent: activePercent,
      degradedPercent,
      failedPercent,
      avgHealthScore: report.avgHealthScore,
    };
  } finally {
    await db.destroy();
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────

async function main(): Promise<never> {
  const config = loadConfig();
  const skipSite = process.env.MONITOR_SKIP_SITE === "1";

  const checks = await Promise.all([
    skipSite
      ? Promise.resolve<CheckDetail>({
          status: "ok",
          message: "Site check skipped by MONITOR_SKIP_SITE env",
          detail: {},
        })
      : checkSite(config),
    checkFreshness(config.rootDir),
    checkSourceHealth(config),
  ]);

  const [site, freshness, sourceHealth] = checks;

  // Compute overall status: critical wins over warning, warning over ok
  const statusValue: Record<"ok" | "warning" | "critical", number> = {
    ok: 0,
    warning: 1,
    critical: 2,
  };

  const statuses: Array<"ok" | "warning" | "critical"> = [
    site.status,
    freshness.status,
    sourceHealth.status,
  ];
  const overallStatus = statuses.reduce<"ok" | "warning" | "critical">(
    (worst, s) => (statusValue[s] > statusValue[worst] ? s : worst),
    "ok",
  );

  // Collect issues and recommendations
  const issues: string[] = [];
  const recommendations: string[] = [];

  if (site.status === "critical") {
    issues.push("Site is unreachable or returned non-200 status.");
    recommendations.push("Check the web server and deployment pipeline.");
    recommendations.push("Run the Pages deployment workflow manually.");
  }

  if (freshness.status !== "ok") {
    const level = freshness.status === "critical" ? "Critical" : "Warning";
    issues.push(`${level}: data snapshot is stale.`);
    recommendations.push("Trigger the data-refresh workflow to update the snapshot.");
  }

  if (sourceHealth.status !== "ok") {
    const level = sourceHealth.status === "critical" ? "Critical" : "Warning";
    issues.push(
      `${level}: source health degraded (${sourceHealth.healthyPercent}% healthy, avg score ${sourceHealth.avgHealthScore})`,
    );
    recommendations.push("Run `npm run sources:audit -- --concurrency=4` for a full audit.");
    recommendations.push("Review quarantined sources and repair failing adapters.");
  }

  const systemScore = Math.max(
    0,
    Math.min(
      100,
      sourceHealth.status === "ok"
        ? sourceHealth.avgHealthScore
        : Math.round(sourceHealth.avgHealthScore * 0.7),
    ),
  );

  const result: MonitorCheckResult = {
    timestamp: new Date().toISOString(),
    status: overallStatus,
    systemScore,
    checks: { site, freshness, sourceHealth },
    issues,
    recommendations,
  };

  // Output JSON
  console.log(JSON.stringify(result, null, 2));

  // Exit code
  const exitCode = statusValue[overallStatus];
  process.exit(exitCode);
}

main().catch((error) => {
  const errorResult: MonitorCheckResult = {
    timestamp: new Date().toISOString(),
    status: "critical",
    systemScore: 0,
    checks: {
      site: { status: "critical", message: "Monitor script error", detail: {} },
      freshness: { status: "critical", message: "Monitor script error", detail: {} },
      sourceHealth: {
        status: "critical",
        message: "Monitor script error",
        detail: {},
        totalSources: 0,
        healthyPercent: 0,
        degradedPercent: 0,
        failedPercent: 0,
        avgHealthScore: 0,
      },
    },
    issues: [`Monitor script crashed: ${error instanceof Error ? error.message : String(error)}`],
    recommendations: ["Check the monitor workflow logs for details."],
  };
  console.log(JSON.stringify(errorResult, null, 2));
  process.exit(2);
});
