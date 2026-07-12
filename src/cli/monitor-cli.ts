/**
 * Monitor CLI — standalone health report generator.
 *
 * Usage:
 *   npm run monitor                Print health report
 *   npm run monitor -- --json      JSON output
 *   npm run monitor -- --fix       Apply adaptive health transitions
 *   npm run monitor -- --watch     Watch mode (refresh every 30s)
 */

import { loadConfig } from "../config/env.js";
import { createDatabase } from "../db/database.js";
import { migrateToLatest } from "../db/migrate.js";
import { applyAdaptiveHealth, generateMonitorReport } from "../pipeline/monitor.js";

async function main() {
  const config = loadConfig();
  const db = createDatabase(config);

  try {
    await migrateToLatest(db, config);

    const jsonMode = process.argv.includes("--json");
    const fixMode = process.argv.includes("--fix");
    const watchMode = process.argv.includes("--watch");

    if (fixMode) {
      console.log("[monitor] Applying adaptive health transitions...");
      const result = await applyAdaptiveHealth(db);
      console.log(`  Degraded: ${result.degraded}`);
      console.log(`  Quarantined: ${result.quarantined}`);
      console.log(`  Recovered: ${result.recovered}`);
      console.log(`  Retired: ${result.retired}`);
    }

    const print = async () => {
      const report = await generateMonitorReport(db);
      if (jsonMode) {
        console.log(JSON.stringify(report, null, 2));
      } else {
        printReport(report);
      }
    };

    await print();

    if (watchMode) {
      console.log("\n[monitor] Watching (Ctrl+C to stop)...");
      const interval = setInterval(async () => {
        console.log(`\n--- ${new Date().toISOString()} ---`);
        try {
          await print();
        } catch (error) {
          console.error("Watch error:", error instanceof Error ? error.message : String(error));
        }
      }, 30_000);

      process.on("SIGINT", () => {
        clearInterval(interval);
        process.exit(0);
      });
    }
  } finally {
    if (!process.argv.includes("--watch")) {
      await db.destroy();
    }
  }
}

function printReport(report: Awaited<ReturnType<typeof generateMonitorReport>>) {
  console.log("\n═══════════════════════════════════════════");
  console.log("  Agent Pulse — System Health Report");
  console.log(`  Generated: ${report.timestamp}`);
  console.log("═══════════════════════════════════════════");

  // Lifecycle overview
  console.log("\n┌─ Source Lifecycle ───────────────────────┐");
  console.log(`│  Active:      ${String(report.activeSources).padEnd(5)} (collecting regularly) │`);
  console.log(
    `│  Degraded:    ${String(report.degradedSources).padEnd(5)} (partial failures)     │`,
  );
  console.log(
    `│  Quarantined: ${String(report.quarantinedSources).padEnd(5)} (auto-disabled)       │`,
  );
  console.log(
    `│  Shadow:      ${String(report.shadowSources).padEnd(5)} (pending activation)    │`,
  );
  console.log(`│  Draft:       ${String(report.draftSources).padEnd(5)} (newly discovered)      │`);
  console.log(
    `│  Retired:     ${String(report.retiredSources).padEnd(5)} (archived)             │`,
  );
  console.log(
    `│  Total:       ${String(report.totalSources).padEnd(5)}                          │`,
  );
  console.log(
    `│  Avg Health:  ${String(report.avgHealthScore).padEnd(5)} / 100                   │`,
  );
  console.log("└──────────────────────────────────────────┘");

  // Coverage gaps
  console.log("\n┌─ Coverage Gaps ──────────────────────────┐");
  for (const gap of report.coverageGaps) {
    const icon = gap.severity === "critical" ? "✗" : gap.severity === "warning" ? "⚠" : "✓";
    const bar = "█".repeat(Math.min(20, Math.round((gap.current / Math.max(1, gap.target)) * 20)));
    console.log(
      `│ ${icon} ${gap.label.padEnd(18)} ${bar.padEnd(20)} ${String(gap.current).padStart(2)}/${String(gap.target).padEnd(3)} │`,
    );
  }
  console.log("└──────────────────────────────────────────┘");

  // Sources needing attention
  if (report.sourcesNeedingAttention.length > 0) {
    console.log("\n┌─ Needs Attention ────────────────────────┐");
    for (const s of report.sourcesNeedingAttention.slice(0, 10)) {
      const flag = s.needsAttention ? "⚠" : " ";
      console.log(
        `│ ${flag} ${s.slug.padEnd(20)} ${s.lifecycle.padEnd(12)} health:${String(s.healthScore).padStart(3)} │`,
      );
    }
    console.log("└──────────────────────────────────────────┘");
  }

  // Recommendations
  if (report.recommendations.length > 0) {
    console.log("\n┌─ Recommendations ────────────────────────┐");
    for (const rec of report.recommendations) {
      const prefix = rec.startsWith("[CRITICAL]") ? "✗" : rec.startsWith("[WARNING]") ? "⚠" : "ℹ";
      console.log(`│ ${prefix} ${rec.slice(0, 60).padEnd(58)} │`);
    }
    console.log("└──────────────────────────────────────────┘");
  }

  console.log("");
}

main().catch((error) => {
  console.error("[monitor] Fatal:", error instanceof Error ? error.message : String(error));
  process.exit(1);
});
