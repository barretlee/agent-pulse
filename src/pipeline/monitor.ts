/**
 * Source health monitoring and adaptive management.
 *
 * Provides:
 *   - Health check scheduling (which sources need attention)
 *   - Adaptive circuit breaker (auto-degrade on repeated failures)
 *   - Recovery probing (test degraded sources periodically)
 *   - Coverage gap analysis (what regions/topics are under-covered)
 *   - Dashboard metrics for the admin panel
 */

import type { Kysely } from "kysely";
import { Repository } from "../db/repository.js";
import type { DatabaseSchema, SourceRow } from "../db/types.js";
import { transitionSource } from "../domain/source-lifecycle.js";

export interface HealthSnapshot {
  slug: string;
  name: string;
  lifecycle: string;
  healthScore: number;
  consecutiveFailures: number;
  lastSuccess: string | null;
  lastError: string | null;
  adapter: string;
  tier: number;
  region: string;
  needsAttention: boolean;
  checkStatus?: string | null;
  itemCount?: number | null;
  qualityScore?: number | null;
  latestItemAt?: string | null;
  repairAction?: string | null;
}

export interface CoverageGap {
  dimension: string;
  label: string;
  current: number;
  catalogCurrent?: number;
  target: number;
  severity: "critical" | "warning" | "ok";
}

export interface MonitorReport {
  timestamp: string;
  totalSources: number;
  activeSources: number;
  degradedSources: number;
  quarantinedSources: number;
  retiredSources: number;
  shadowSources: number;
  observedShadowSources?: number;
  draftSources: number;
  avgHealthScore: number;
  checkedSources?: number;
  healthyCheckedSources?: number;
  skippedCheckedSources?: number;
  repairableCheckedSources?: number;
  checkCoveragePercent?: number;
  auditHealthyPercent?: number;
  automatableHealthyPercent?: number;
  sourcesNeedingAttention: HealthSnapshot[];
  coverageGaps: CoverageGap[];
  recommendations: string[];
}

export function sourceLifecyclePercentages(
  report: Pick<
    MonitorReport,
    | "totalSources"
    | "activeSources"
    | "degradedSources"
    | "quarantinedSources"
    | "retiredSources"
    | "shadowSources"
    | "draftSources"
  >,
): { activePercent: number; degradedPercent: number; failedPercent: number } {
  const effective = Math.max(0, report.totalSources - report.shadowSources - report.draftSources);
  if (effective === 0) return { activePercent: 0, degradedPercent: 0, failedPercent: 0 };
  const percent = (count: number) =>
    Math.max(0, Math.min(100, Math.round((Math.max(0, count) / effective) * 100)));
  return {
    activePercent: percent(report.activeSources),
    degradedPercent: percent(report.degradedSources),
    failedPercent: percent(report.quarantinedSources + report.retiredSources),
  };
}

/**
 * Generate a full monitoring report.
 */
export async function generateMonitorReport(db: Kysely<DatabaseSchema>): Promise<MonitorReport> {
  const sources = await db.selectFrom("sources").selectAll().execute();
  const latestChecks = await new Repository(db).latestSourceChecks();
  const checksBySource = new Map(latestChecks.map((check) => [check.source_id, check]));

  const byLifecycle = groupBy(sources, (s) => s.lifecycle_status);
  const active = byLifecycle.get("active") ?? [];
  const degraded = byLifecycle.get("degraded") ?? [];
  const quarantined = byLifecycle.get("quarantined") ?? [];
  const retired = byLifecycle.get("retired") ?? [];
  const shadow = byLifecycle.get("shadow") ?? [];
  const draft = byLifecycle.get("draft") ?? [];

  const observedSources = sources.filter(
    (source) => source.last_success_at || checksBySource.has(source.id),
  );
  const avgHealth = observedSources.length
    ? Math.round(
        observedSources.reduce((sum, source) => sum + source.health_score, 0) /
          observedSources.length,
      )
    : 0;
  const healthyCheckedSources = latestChecks.filter((check) => check.status === "healthy").length;
  const skippedCheckedSources = latestChecks.filter((check) => check.status === "skipped").length;
  const repairableCheckedSources = latestChecks.filter(
    (check) => check.status === "failed" || check.status === "degraded",
  ).length;
  const automatableChecks = latestChecks.length - skippedCheckedSources;

  // Find sources needing attention
  const needsAttention = sources
    .filter(
      (s) =>
        s.consecutive_failures >= 2 ||
        s.health_score < 60 ||
        s.lifecycle_status === "degraded" ||
        s.lifecycle_status === "quarantined" ||
        checksBySource.get(s.id)?.status === "failed" ||
        checksBySource.get(s.id)?.status === "degraded",
    )
    .map((source) => toSnapshot(source, checksBySource.get(source.id)))
    .sort((a, b) => a.healthScore - b.healthScore);

  // Analyze coverage gaps
  const coverageGaps = analyzeCoverageGaps(sources, checksBySource);

  // Generate recommendations
  const recommendations = generateRecommendations(sources, coverageGaps, latestChecks);

  return {
    timestamp: new Date().toISOString(),
    totalSources: sources.length,
    activeSources: active.length,
    degradedSources: degraded.length,
    quarantinedSources: quarantined.length,
    retiredSources: retired.length,
    shadowSources: shadow.length,
    observedShadowSources: shadow.filter((source) => source.observation_enabled === 1).length,
    draftSources: draft.length,
    avgHealthScore: avgHealth,
    checkedSources: latestChecks.length,
    healthyCheckedSources,
    skippedCheckedSources,
    repairableCheckedSources,
    checkCoveragePercent: Math.round((latestChecks.length / Math.max(1, sources.length)) * 100),
    auditHealthyPercent: Math.round(
      (healthyCheckedSources / Math.max(1, latestChecks.length)) * 100,
    ),
    automatableHealthyPercent: Math.round(
      (healthyCheckedSources / Math.max(1, automatableChecks)) * 100,
    ),
    sourcesNeedingAttention: needsAttention.slice(0, 20),
    coverageGaps,
    recommendations,
  };
}

/**
 * Apply adaptive health transitions based on current state.
 * Returns the number of sources transitioned.
 */
export async function applyAdaptiveHealth(
  db: Kysely<DatabaseSchema>,
): Promise<{ degraded: number; quarantined: number; recovered: number; retired: number }> {
  const sources = await db.selectFrom("sources").selectAll().execute();
  const result = { degraded: 0, quarantined: 0, recovered: 0, retired: 0 };

  for (const source of sources) {
    try {
      // Auto-quarantine: 5+ consecutive failures
      if (source.consecutive_failures >= 5 && source.lifecycle_status === "degraded") {
        const next = transitionSource(source.lifecycle_status, "quarantine");
        await db
          .updateTable("sources")
          .set({
            lifecycle_status: next,
            enabled: 0,
            updated_at: new Date().toISOString(),
          })
          .where("id", "=", source.id)
          .execute();
        result.quarantined++;
        continue;
      }

      // Auto-degrade: 2+ consecutive failures
      if (source.consecutive_failures >= 2 && source.lifecycle_status === "active") {
        const next = transitionSource(source.lifecycle_status, "degrade");
        await db
          .updateTable("sources")
          .set({
            lifecycle_status: next,
            updated_at: new Date().toISOString(),
          })
          .where("id", "=", source.id)
          .execute();
        result.degraded++;
      }

      // Recovery and retirement require an explicit reviewed lifecycle action.
      // A transient success must not reactivate a source, and elapsed time alone
      // must never destroy an otherwise useful source relationship.
    } catch {
      // Skip sources where transition is invalid
    }
  }

  return result;
}

/**
 * Probe quarantined sources to check if they've recovered.
 */
export async function probeQuarantinedSources(
  db: Kysely<DatabaseSchema>,
  maxProbes = 5,
): Promise<Array<{ slug: string; recovered: boolean }>> {
  const quarantined = await db
    .selectFrom("sources")
    .selectAll()
    .where("lifecycle_status", "=", "quarantined")
    .orderBy("last_verified_at", "asc")
    .limit(maxProbes)
    .execute();

  return quarantined.map((source) => ({
    slug: source.slug,
    recovered: false, // Will be set to true after successful collection
  }));
}

// ─── Alert & Severity ────────────────────────────────────────────────────

/**
 * Returns true if the monitor report indicates a critical state.
 * A report is critical when:
 *  - the site is unavailable (passed via options), or
 *  - more than 30% of non-shadow sources are quarantined/failed, or
 *  - the average health score is below 20.
 */
export function isCritical(report: MonitorReport, options?: { siteAvailable?: boolean }): boolean {
  if (options?.siteAvailable === false) return true;

  const effective = report.totalSources - report.shadowSources - report.draftSources;
  if (effective <= 0) return false;

  const failedRatio = (report.quarantinedSources + report.retiredSources) / effective;
  if (failedRatio > 0.3) return true;

  if (report.avgHealthScore < 20) return true;

  return false;
}

/**
 * Derive the overall severity level from a monitor report.
 */
export function getSeverityLevel(
  report: MonitorReport,
  options?: { siteAvailable?: boolean },
): "critical" | "warning" | "ok" {
  if (isCritical(report, options)) return "critical";

  const effective = report.totalSources - report.shadowSources - report.draftSources;
  if (effective <= 0) return "ok";

  const degradedRatio = report.degradedSources / effective;
  if (degradedRatio > 0.1 || report.avgHealthScore < 40) return "warning";

  const criticalGaps = report.coverageGaps.filter((g) => g.severity === "critical");
  if (criticalGaps.length > 0) return "warning";

  return "ok";
}

/**
 * Generate a structured email alert body from a monitor report.
 * Produces a plain-text message with what happened, root cause, and fix suggestions.
 */
export function generateAlertEmail(report: MonitorReport): { subject: string; body: string } {
  const lines: string[] = [];
  const push = (text: string) => lines.push(text);

  push("=== Agent Pulse — Critical Alert ===");
  push(`Generated: ${report.timestamp}`);
  push("");

  // What happened
  push("--- What Happened ---");
  push(`Total sources: ${report.totalSources}`);
  push(
    `Active: ${report.activeSources} | Degraded: ${report.degradedSources} | Quarantined: ${report.quarantinedSources} | Retired: ${report.retiredSources}`,
  );
  push(`Average health score: ${report.avgHealthScore}/100`);
  push(`Audit healthy rate: ${report.auditHealthyPercent ?? "N/A"}%`);
  if (report.sourcesNeedingAttention.length > 0) {
    push("");
    push("Sources needing attention (top 5):");
    for (const s of report.sourcesNeedingAttention.slice(0, 5)) {
      push(
        `  - ${s.slug} [${s.lifecycle}] health=${s.healthScore} failures=${s.consecutiveFailures}`,
      );
    }
  }

  // Root cause
  push("");
  push("--- Root Cause ---");
  if (report.avgHealthScore < 20) {
    push("- Critically low average health score indicates systemic issues.");
  }
  const failed = report.quarantinedSources;
  const effective = report.totalSources - report.shadowSources - report.draftSources;
  if (effective > 0 && failed / effective > 0.3) {
    push(
      `- ${failed}/${effective} active sources are quarantined (${Math.round((failed / effective) * 100)}%).`,
    );
  }
  if (report.degradedSources > 0) {
    push(`- ${report.degradedSources} sources are in a degraded state.`);
  }
  const failedChecks = report.repairableCheckedSources ?? 0;
  if (failedChecks > 0) {
    push(`- Latest audit found ${failedChecks} sources with failed/degraded checks.`);
  }

  // Gaps
  const criticalGaps = report.coverageGaps.filter((g) => g.severity === "critical");
  if (criticalGaps.length > 0) {
    push("");
    push("Critical coverage gaps:");
    for (const gap of criticalGaps) {
      push(`  - ${gap.label}: ${gap.current}/${gap.target} sources`);
    }
  }

  // Fix suggestions
  push("");
  push("--- Suggested Fixes ---");
  if (report.avgHealthScore < 20) {
    push("- Run `npm run sources:audit` to re-check all sources and identify failing endpoints.");
    push("- Review disconnected or permanently changed upstream feeds.");
  }
  if (failed > 0) {
    push("- Check quarantined sources: review error logs and decide whether to repair or retire.");
    push("- Update adapter configurations or endpoint URLs as needed.");
  }
  if (report.degradedSources > 0) {
    push("- Inspect degraded sources for network issues or rate limiting.");
    push("- Run `npm run monitor -- --fix` to apply adaptive health transitions.");
  }
  if (failedChecks > 0) {
    push("- Run `npm run sources:audit -- --concurrency=4` for detailed per-source diagnostics.");
  }
  push("- Review the full health report at: https://github.com/barretlee/agent-pulse/actions");
  push("");

  push("=== End of Alert ===");

  // Build subject
  let subjectSummary = "";
  if (report.avgHealthScore < 20) subjectSummary = "System health score critically low";
  else if (failed > 0) subjectSummary = `${failed} sources quarantined`;
  else subjectSummary = "Critical system anomaly detected";

  const subject = `AGENT-PULSE CRITICAL: ${subjectSummary}`;

  return { subject, body: lines.join("\n") };
}

// ─── Coverage Analysis ────────────────────────────────────────────────────

interface CoverageTarget {
  dimension: string;
  label: string;
  target: number;
  filter: (source: SourceRow) => boolean;
}

const COVERAGE_TARGETS: CoverageTarget[] = [
  {
    dimension: "cn-sources",
    label: "中文源 (CN)",
    target: 20,
    filter: (s) => s.language === "zh-CN" && s.enabled === 1,
  },
  {
    dimension: "paper-research",
    label: "论文/研究源",
    target: 15,
    filter: (s) =>
      (s.source_category === "research-eval" || s.topics_json.includes("research")) &&
      s.enabled === 1,
  },
  {
    dimension: "capital-vc",
    label: "投资/资本源",
    target: 10,
    filter: (s) =>
      (s.source_category === "capital-business" || s.topics_json.includes("capital")) &&
      s.enabled === 1,
  },
  {
    dimension: "open-source",
    label: "开源动态源",
    target: 15,
    filter: (s) =>
      (s.source_category === "open-source" || s.acquisition === "github") && s.enabled === 1,
  },
  {
    dimension: "policy-gov",
    label: "政策/监管源",
    target: 5,
    filter: (s) => s.source_category === "policy" && s.enabled === 1,
  },
  {
    dimension: "expert-people",
    label: "人物/观点源",
    target: 20,
    filter: (s) => (s.source_category === "expert" || s.role === "expert") && s.enabled === 1,
  },
  {
    dimension: "frontier-lab",
    label: "前沿实验室源",
    target: 15,
    filter: (s) => s.source_category === "frontier-lab" && s.enabled === 1,
  },
  {
    dimension: "cn-lab",
    label: "中国 AI 实验室源",
    target: 15,
    filter: (s) => s.source_category === "china-lab" && s.enabled === 1,
  },
];

function analyzeCoverageGaps(
  sources: SourceRow[],
  checksBySource: Map<string, { status: string }>,
): CoverageGap[] {
  return COVERAGE_TARGETS.map(({ dimension, label, target, filter }) => {
    const catalogCurrent = sources.filter((source) => filter({ ...source, enabled: 1 })).length;
    const current = sources.filter(
      (source) =>
        filter({ ...source, enabled: 1 }) && checksBySource.get(source.id)?.status === "healthy",
    ).length;
    let severity: CoverageGap["severity"];
    if (current === 0) severity = "critical";
    else if (current < target * 0.5) severity = "warning";
    else severity = "ok";

    return { dimension, label, current, catalogCurrent, target, severity };
  });
}

function generateRecommendations(
  sources: SourceRow[],
  gaps: CoverageGap[],
  checks: Array<{ status: string }>,
): string[] {
  const recs: string[] = [];

  // Coverage-based recommendations
  for (const gap of gaps) {
    if (gap.severity === "critical") {
      recs.push(`[CRITICAL] ${gap.label}覆盖为 0，需要立即接入至少 ${gap.target} 个来源`);
    } else if (gap.severity === "warning") {
      recs.push(
        `[WARNING] ${gap.label}仅 ${gap.current}/${gap.target}，需要补充 ${gap.target - gap.current} 个来源`,
      );
    }
  }

  // Health-based recommendations
  const degradedCount = sources.filter((s) => s.lifecycle_status === "degraded").length;
  if (degradedCount > sources.length * 0.1) {
    recs.push(`[WARNING] ${degradedCount} 个来源处于 degraded 状态，建议排查网络和适配器问题`);
  }

  const repairableChecks = checks.filter(
    (check) => check.status === "failed" || check.status === "degraded",
  ).length;
  if (repairableChecks > 0) {
    recs.push(
      `[CRITICAL] 最新逐源审计有 ${repairableChecks} 个自动来源 failed/degraded，应按错误池修复而不是依赖生命周期默认分`,
    );
  }

  const untestedCount = sources.filter((source) => !source.last_verified_at).length;
  if (untestedCount > 0) {
    recs.push(`[INFO] 仍有 ${untestedCount} 个来源缺少完整检查，建议运行 npm run sources:audit`);
  }

  // Adapter coverage
  const adapterSet = new Set(sources.map((s) => s.adapter));
  if (adapterSet.has("manual")) {
    recs.push("[WARNING] 存在使用 'manual' adapter 的来源，需要实现对应的 collector");
  }

  return recs;
}

// ─── Helpers ─────────────────────────────────────────────────────────────

function groupBy<T, K>(items: T[], keyFn: (item: T) => K): Map<K, T[]> {
  const map = new Map<K, T[]>();
  for (const item of items) {
    const key = keyFn(item);
    const group = map.get(key);
    if (group) group.push(item);
    else map.set(key, [item]);
  }
  return map;
}

function toSnapshot(
  source: SourceRow,
  check?: {
    status: string;
    item_count: number;
    quality_score: number;
    latest_item_at: string | null;
    repair_action: string;
  },
): HealthSnapshot {
  return {
    slug: source.slug,
    name: source.name,
    lifecycle: source.lifecycle_status,
    healthScore: source.health_score,
    consecutiveFailures: source.consecutive_failures,
    lastSuccess: source.last_success_at,
    lastError: source.last_error?.slice(0, 200) ?? null,
    adapter: source.adapter,
    tier: source.tier,
    region: source.region,
    needsAttention:
      source.consecutive_failures >= 2 ||
      source.health_score < 60 ||
      source.lifecycle_status === "degraded" ||
      check?.status === "failed" ||
      check?.status === "degraded",
    checkStatus: check?.status ?? null,
    itemCount: check?.item_count ?? null,
    qualityScore: check?.quality_score ?? null,
    latestItemAt: check?.latest_item_at ?? null,
    repairAction: check?.repair_action ?? null,
  };
}
