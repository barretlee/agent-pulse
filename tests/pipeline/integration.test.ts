/**
 * Integration tests for the self-evolution pipeline.
 *
 * These tests verify that the full pipeline components work together:
 *   monitor → strategy → discovery → health → quality → evolution
 */

import { describe, expect, it } from "vitest";
import {
  applySourceFailure,
  applySourceSuccess,
  canRunScheduled,
  transitionSource,
} from "../../src/domain/source-lifecycle.js";
import type { CollectedSignal, SourceDescriptor } from "../../src/domain/types.js";
import { filterByQuality, scoreBatch } from "../../src/pipeline/quality.js";
import { generateEvolutionPlan } from "../../src/pipeline/strategy.js";

describe("Pipeline Integration", () => {
  describe("Source Lifecycle → Monitor → Strategy chain", () => {
    it("transitions through full lifecycle correctly", () => {
      // draft → shadow
      expect(transitionSource("draft", "verify")).toBe("shadow");
      // shadow → active
      expect(transitionSource("shadow", "activate")).toBe("active");
      // active → degraded
      expect(transitionSource("active", "degrade")).toBe("degraded");
      // degraded → quarantined
      expect(transitionSource("degraded", "quarantine")).toBe("quarantined");
      // quarantined → shadow (restore)
      expect(transitionSource("quarantined", "restore")).toBe("shadow");
      // quarantined → retired
      expect(transitionSource("quarantined", "retire")).toBe("retired");
      // retired → shadow (restore from archive)
      expect(transitionSource("retired", "restore")).toBe("shadow");
      // degraded → active (recover)
      expect(transitionSource("degraded", "activate")).toBe("active");
    });

    it("throws on invalid transitions", () => {
      expect(() => transitionSource("active", "verify")).toThrow();
      expect(() => transitionSource("retired", "degrade")).toThrow();
      expect(() => transitionSource("draft", "quarantine")).toThrow();
    });

    it("canRunScheduled returns correct values", () => {
      expect(canRunScheduled("active")).toBe(true);
      expect(canRunScheduled("degraded")).toBe(true);
      expect(canRunScheduled("shadow")).toBe(false);
      expect(canRunScheduled("quarantined")).toBe(false);
      expect(canRunScheduled("retired")).toBe(false);
      expect(canRunScheduled("draft")).toBe(false);
    });
  });

  describe("Health → Strategy feedback loop", () => {
    it("healthy system generates fewer urgent actions", () => {
      const healthyMonitor = {
        timestamp: new Date().toISOString(),
        totalSources: 100,
        activeSources: 80,
        degradedSources: 2,
        quarantinedSources: 0,
        retiredSources: 5,
        shadowSources: 10,
        draftSources: 3,
        avgHealthScore: 92,
        sourcesNeedingAttention: [],
        coverageGaps: [
          {
            dimension: "cn-sources",
            label: "中文源",
            current: 18,
            target: 20,
            severity: "ok" as const,
          },
        ],
        recommendations: [],
      };

      const plan = generateEvolutionPlan(healthyMonitor);
      const urgentActions = plan.actions.filter((a) => a.priority === "now");
      expect(urgentActions.length).toBe(0);
    });

    it("unhealthy system generates urgent actions", () => {
      const unhealthyMonitor = {
        timestamp: new Date().toISOString(),
        totalSources: 100,
        activeSources: 20,
        degradedSources: 15,
        quarantinedSources: 8,
        retiredSources: 10,
        shadowSources: 40,
        draftSources: 7,
        avgHealthScore: 45,
        sourcesNeedingAttention: Array.from({ length: 15 }, (_, i) => ({
          slug: `broken-${i}`,
          name: `broken-${i}`,
          lifecycle: "degraded" as const,
          healthScore: 40,
          consecutiveFailures: 3,
          lastSuccess: null,
          lastError: "Error",
          adapter: "rss",
          tier: 3,
          region: "GLOBAL",
          needsAttention: true,
        })),
        coverageGaps: [
          {
            dimension: "cn-sources",
            label: "中文源",
            current: 2,
            target: 20,
            severity: "warning" as const,
          },
          {
            dimension: "policy-gov",
            label: "政策源",
            current: 0,
            target: 5,
            severity: "critical" as const,
          },
        ],
        recommendations: ["[CRITICAL] Fix sources", "[WARNING] Improve coverage"],
      };

      const plan = generateEvolutionPlan(unhealthyMonitor);
      const urgentActions = plan.actions.filter((a) => a.priority === "now");
      expect(urgentActions.length).toBeGreaterThan(0);
      // Should have fix-adapter action
      expect(plan.actions.some((a) => a.category === "fix-adapter")).toBe(true);
    });
  });

  describe("Quality → Strategy integration", () => {
    it("low quality triggers improvement action", () => {
      const monitor = {
        timestamp: new Date().toISOString(),
        totalSources: 50,
        activeSources: 40,
        degradedSources: 0,
        quarantinedSources: 0,
        retiredSources: 0,
        shadowSources: 10,
        draftSources: 0,
        avgHealthScore: 90,
        sourcesNeedingAttention: [],
        coverageGaps: [],
        recommendations: [],
      };

      const lowQuality = {
        total: 200,
        avgScore: 42,
        gradeDistribution: { A: 5, B: 10, C: 30, D: 100, F: 55 } as Record<string, number>,
        topFlags: [{ flag: "thin-content" as const, count: 100 }],
      };

      const plan = generateEvolutionPlan(monitor, lowQuality);
      expect(plan.actions.some((a) => a.category === "improve-quality")).toBe(true);
    });

    it("high quality does not trigger improvement action", () => {
      const monitor = {
        timestamp: new Date().toISOString(),
        totalSources: 50,
        activeSources: 40,
        degradedSources: 0,
        quarantinedSources: 0,
        retiredSources: 0,
        shadowSources: 10,
        draftSources: 0,
        avgHealthScore: 90,
        sourcesNeedingAttention: [],
        coverageGaps: [],
        recommendations: [],
      };

      const highQuality = {
        total: 200,
        avgScore: 82,
        gradeDistribution: { A: 80, B: 80, C: 30, D: 10, F: 0 } as Record<string, number>,
        topFlags: [{ flag: "no-tags" as const, count: 10 }],
      };

      const plan = generateEvolutionPlan(monitor, highQuality);
      expect(plan.actions.some((a) => a.category === "improve-quality")).toBe(false);
    });
  });

  describe("Quality scoring → Filter chain", () => {
    function makeSignal(overrides?: Partial<CollectedSignal>): CollectedSignal {
      return {
        externalId: "test",
        url: "https://example.com/test",
        title: "Test Signal Title",
        summary:
          "A comprehensive test signal summary with enough content to be meaningful for quality scoring purposes.",
        language: "en",
        publishedAt: new Date().toISOString(),
        category: "test",
        tags: ["test"],
        metrics: {},
        rawMeta: {},
        ...overrides,
      };
    }

    function makeSource(): Pick<SourceDescriptor, "tier" | "role" | "authorityScore" | "region"> {
      return { tier: 1, role: "primary", authorityScore: 92, region: "US" };
    }

    it("high-quality signals pass filter", () => {
      const signals = [makeSignal()];
      const filtered = filterByQuality(signals, makeSource(), "C");
      expect(filtered.length).toBe(1);
    });

    it("low-quality signals are filtered out", () => {
      const signals = [
        makeSignal({
          title: "Hi",
          summary: "Short",
          tags: [],
          publishedAt: new Date(Date.now() - 365 * 86_400_000).toISOString(),
        }),
      ];
      const filtered = filterByQuality(signals, makeSource(), "B");
      expect(filtered.length).toBe(0);
    });

    it("batch scoring produces correct summary", () => {
      const signals = [
        makeSignal({
          title: "Good Article About AI Research",
          summary: "A".repeat(500),
          tags: ["AI", "ML", "Research"],
        }),
        makeSignal({
          title: "OK Update",
          summary: "Some update about technology.",
          tags: ["tech"],
        }),
        makeSignal({ title: "Bad", summary: "x", tags: [] }),
      ];
      const { summary } = scoreBatch(signals, makeSource());
      expect(summary.total).toBe(3);
      expect(summary.avgScore).toBeGreaterThan(0);
      expect(
        summary.gradeDistribution.A +
          summary.gradeDistribution.B +
          summary.gradeDistribution.C +
          summary.gradeDistribution.D +
          summary.gradeDistribution.F,
      ).toBe(3);
    });
  });

  describe("Source lifecycle health calculus", () => {
    it("applySourceSuccess improves health", () => {
      const state = {
        lifecycle: "active" as const,
        healthScore: 80,
        consecutiveFailures: 0,
        successCount: 5,
        failureCount: 0,
      };
      const next = applySourceSuccess(state);
      expect(next.healthScore).toBeGreaterThan(80);
      expect(next.consecutiveFailures).toBe(0);
      expect(next.successCount).toBe(6);
    });

    it("applySourceSuccess keeps degraded sources gated for reviewed recovery", () => {
      const state = {
        lifecycle: "degraded" as const,
        healthScore: 60,
        consecutiveFailures: 2,
        successCount: 3,
        failureCount: 2,
      };
      const next = applySourceSuccess(state);
      expect(next.lifecycle).toBe("degraded");
      expect(next.consecutiveFailures).toBe(0);
    });

    it("applySourceFailure degrades after 2 consecutive failures", () => {
      const state = {
        lifecycle: "active" as const,
        healthScore: 85,
        consecutiveFailures: 1,
        successCount: 5,
        failureCount: 1,
      };
      const next = applySourceFailure(state);
      expect(next.consecutiveFailures).toBe(2);
      expect(next.lifecycle).toBe("degraded");
      expect(next.healthScore).toBeLessThan(85);
    });

    it("applySourceFailure quarantines after 5 consecutive failures", () => {
      const state = {
        lifecycle: "degraded" as const,
        healthScore: 40,
        consecutiveFailures: 4,
        successCount: 1,
        failureCount: 4,
      };
      const next = applySourceFailure(state);
      expect(next.consecutiveFailures).toBe(5);
      expect(next.lifecycle).toBe("quarantined");
    });

    it("applySourceFailure with severe flag deducts more health", () => {
      const normal = applySourceFailure({
        lifecycle: "active" as const,
        healthScore: 80,
        consecutiveFailures: 0,
        successCount: 5,
        failureCount: 0,
      });
      const severe = applySourceFailure(
        {
          lifecycle: "active" as const,
          healthScore: 80,
          consecutiveFailures: 0,
          successCount: 5,
          failureCount: 0,
        },
        true,
      );
      expect(severe.healthScore).toBeLessThan(normal.healthScore);
    });

    it("retired sources are never affected", () => {
      const state = {
        lifecycle: "retired" as const,
        healthScore: 10,
        consecutiveFailures: 10,
        successCount: 0,
        failureCount: 10,
      };
      expect(applySourceSuccess(state).lifecycle).toBe("retired");
      expect(applySourceFailure(state).lifecycle).toBe("retired");
    });
  });
});
