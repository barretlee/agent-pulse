import { describe, expect, it } from "vitest";
import type { MonitorReport } from "../../src/pipeline/monitor.js";
import type { QualitySummary } from "../../src/pipeline/quality.js";
import {
  generateEvolutionPlan,
  mergePlans,
  selectTopActions,
} from "../../src/pipeline/strategy.js";

function makeMonitor(overrides?: Partial<MonitorReport>): MonitorReport {
  return {
    timestamp: new Date().toISOString(),
    totalSources: 50,
    activeSources: 10,
    degradedSources: 3,
    quarantinedSources: 1,
    retiredSources: 2,
    shadowSources: 30,
    draftSources: 4,
    avgHealthScore: 75,
    sourcesNeedingAttention: [
      {
        slug: "degraded-1",
        name: "degraded-1",
        lifecycle: "degraded",
        healthScore: 55,
        consecutiveFailures: 3,
        lastSuccess: null,
        lastError: "Timeout",
        adapter: "rss",
        tier: 2,
        region: "GLOBAL",
        needsAttention: true,
      },
      {
        slug: "quarantined-1",
        name: "quarantined-1",
        lifecycle: "quarantined",
        healthScore: 20,
        consecutiveFailures: 7,
        lastSuccess: null,
        lastError: "HTTP 500",
        adapter: "web-scraper",
        tier: 3,
        region: "US",
        needsAttention: true,
      },
    ],
    coverageGaps: [
      {
        dimension: "cn-sources",
        label: "中文源 (CN)",
        current: 5,
        target: 20,
        severity: "warning",
      },
      {
        dimension: "policy-gov",
        label: "政策/监管源",
        current: 0,
        target: 5,
        severity: "critical",
      },
      { dimension: "capital-vc", label: "投资/资本源", current: 8, target: 10, severity: "ok" },
      {
        dimension: "paper-research",
        label: "论文/研究源",
        current: 10,
        target: 15,
        severity: "warning",
      },
      { dimension: "open-source", label: "开源动态源", current: 12, target: 15, severity: "ok" },
      {
        dimension: "expert-people",
        label: "人物/观点源",
        current: 3,
        target: 20,
        severity: "warning",
      },
      { dimension: "frontier-lab", label: "前沿实验室源", current: 15, target: 15, severity: "ok" },
      {
        dimension: "cn-lab",
        label: "中国 AI 实验室源",
        current: 10,
        target: 15,
        severity: "warning",
      },
    ],
    recommendations: [
      "[CRITICAL] 政策/监管源覆盖为 0，需要立即接入至少 5 个来源",
      "[WARNING] 人物/观点源仅 3/20，需要补充 17 个来源",
    ],
    ...overrides,
  };
}

function makeQuality(overrides?: Partial<QualitySummary>): QualitySummary {
  return {
    total: 100,
    avgScore: 55,
    gradeDistribution: { A: 5, B: 15, C: 30, D: 35, F: 15 },
    topFlags: [
      { flag: "thin-content", count: 40 },
      { flag: "low-authority", count: 30 },
      { flag: "no-tags", count: 25 },
    ],
    ...overrides,
  };
}

describe("generateEvolutionPlan", () => {
  it("generates actions for critical coverage gaps", () => {
    const plan = generateEvolutionPlan(makeMonitor());
    const criticalActions = plan.actions.filter((a) => a.priority === "now");
    expect(criticalActions.length).toBeGreaterThan(0);
    // Should have an action about policy-gov gap
    expect(plan.actions.some((a) => a.impactArea === "policy-gov")).toBe(true);
  });

  it("generates actions for warning coverage gaps", () => {
    const plan = generateEvolutionPlan(makeMonitor());
    const warningActions = plan.actions.filter((a) => a.priority === "next");
    expect(warningActions.length).toBeGreaterThan(0);
  });

  it("generates fix-adapter action when degraded count is high", () => {
    const plan = generateEvolutionPlan(
      makeMonitor({
        degradedSources: 8,
        sourcesNeedingAttention: Array.from({ length: 8 }, (_, i) => ({
          slug: `degraded-${i}`,
          name: `degraded-${i}`,
          lifecycle: "degraded" as const,
          healthScore: 50,
          consecutiveFailures: 3,
          lastSuccess: null,
          lastError: "Timeout",
          adapter: "rss",
          tier: 2,
          region: "GLOBAL",
          needsAttention: true,
        })),
      }),
    );
    expect(plan.actions.some((a) => a.category === "fix-adapter")).toBe(true);
  });

  it("uses real audit health instead of lifecycle defaults", () => {
    const plan = generateEvolutionPlan(
      makeMonitor({
        avgHealthScore: 98,
        checkedSources: 196,
        healthyCheckedSources: 68,
        skippedCheckedSources: 44,
        repairableCheckedSources: 84,
        automatableHealthyPercent: 45,
      }),
    );

    expect(
      plan.actions.some(
        (action) => action.impactArea === "source-audit-health" && action.priority === "now",
      ),
    ).toBe(true);
  });

  it("generates quality improvement action when quality is low", () => {
    const plan = generateEvolutionPlan(makeMonitor(), makeQuality({ avgScore: 45 }));
    expect(plan.actions.some((a) => a.category === "improve-quality")).toBe(true);
  });

  it("includes capability-building actions", () => {
    const plan = generateEvolutionPlan(makeMonitor());
    const capActions = plan.actions.filter((a) => a.category === "add-capability");
    expect(capActions.length).toBeGreaterThanOrEqual(3);
  });

  it("generates correct summary", () => {
    const plan = generateEvolutionPlan(makeMonitor());
    expect(plan.summary).toBeTruthy();
    expect(plan.version).toBe(1);
    expect(plan.metrics.totalActions).toBeGreaterThan(0);
  });

  it("tracks metrics correctly", () => {
    const plan = generateEvolutionPlan(makeMonitor());
    const { byPriority } = plan.metrics;
    expect(byPriority.now + byPriority.next + byPriority.later + byPriority.wishlist).toBe(
      plan.metrics.totalActions,
    );
  });
});

describe("selectTopActions", () => {
  it("selects top N actions by priority", () => {
    const plan = generateEvolutionPlan(makeMonitor());
    const top3 = selectTopActions(plan, 3);
    expect(top3.length).toBe(3);
    // First actions should be "now" priority
    expect(top3[0]?.priority).toBe("now");
  });

  it("returns empty for empty plan", () => {
    const emptyPlan = generateEvolutionPlan(
      makeMonitor({
        coverageGaps: [],
        recommendations: [],
        degradedSources: 0,
        sourcesNeedingAttention: [],
      }),
    );
    const top = selectTopActions(emptyPlan, 5);
    // Should still have capability actions
    expect(
      top.every(
        (a) => a.priority === "next" || a.priority === "later" || a.priority === "wishlist",
      ),
    ).toBe(true);
  });
});

describe("mergePlans", () => {
  it("deduplicates actions across plans", () => {
    const plan1 = generateEvolutionPlan(makeMonitor());
    const plan2 = generateEvolutionPlan(makeMonitor({ avgHealthScore: 70 }));
    const merged = mergePlans([plan1, plan2]);

    expect(merged.actions.length).toBeLessThanOrEqual(plan1.actions.length + plan2.actions.length);
    expect(merged.version).toBe(2);
    expect(merged.summary).toContain("Merged from 2 plans");
  });

  it("handles single plan merge", () => {
    const plan = generateEvolutionPlan(makeMonitor());
    const merged = mergePlans([plan]);
    expect(merged.actions.length).toBe(plan.actions.length);
    expect(merged.version).toBe(2);
  });
});
