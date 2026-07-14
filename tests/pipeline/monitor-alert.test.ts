import { describe, expect, it, vi } from "vitest";
import type { JsonModelClient } from "../../src/ai/deepseek.js";
import {
  decideMonitorAlert,
  type MonitorReportInput,
  monitorFingerprint,
} from "../../src/pipeline/monitor-alert.js";

const NOW = new Date("2026-07-14T08:00:00.000Z");

function report(overrides: Record<string, unknown> = {}): MonitorReportInput {
  return {
    timestamp: "2026-07-14T07:59:00.000Z",
    status: "critical",
    systemScore: 69,
    checks: {
      site: { status: "ok", message: "Site is reachable", detail: { httpStatus: 200 } },
      freshness: {
        status: "ok",
        message: "Snapshot is fresh",
        detail: { ageMinutes: 60 },
      },
      sourceHealth: {
        status: "critical",
        message: "Production lifecycle: 6% active; latest audit: 98% healthy",
        detail: {
          activeSources: 24,
          shadowSources: 350,
          auditHealthyPercent: 98,
          avgHealthScore: 98,
        },
      },
    },
    issues: ["Critical: production source coverage is low (6% active, avg observed score 98)"],
    recommendations: ["Run the source audit."],
    ...overrides,
  } as MonitorReportInput;
}

function client(value: unknown): JsonModelClient {
  return {
    completeJson: vi.fn().mockResolvedValue({
      value,
      model: "deepseek-v4-flash",
      usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 },
    }),
  };
}

describe("monitor alert decision", () => {
  it("never lets the model suppress a public site outage", async () => {
    const model = client({
      decision: "suppress",
      confidence: 0.99,
      reasonCode: "insufficient_evidence",
      rationale: "The outage may be temporary.",
      suggestedAction: "Wait.",
    });
    const input = report({
      checks: {
        ...report().checks,
        site: { status: "critical", message: "Site unreachable", detail: {} },
      },
    });

    const decision = await decideMonitorAlert({ report: input, client: model, now: NOW });

    expect(decision).toMatchObject({
      decision: "alert",
      notify: true,
      decisionSource: "hard-rule",
      reasonCode: "site_unreachable",
    });
    expect(model.completeJson).not.toHaveBeenCalled();
  });

  it("treats a snapshot older than 72 hours as a hard failure", async () => {
    const input = report({
      checks: {
        ...report().checks,
        freshness: {
          status: "critical",
          message: "Snapshot is critically stale",
          detail: { ageMinutes: 4_500 },
        },
        sourceHealth: { ...report().checks.sourceHealth, status: "ok" },
      },
    });

    const decision = await decideMonitorAlert({ report: input, now: NOW });

    expect(decision.reasonCode).toBe("snapshot_persistently_stale");
    expect(decision.notify).toBe(true);
  });

  it("suppresses the legacy source-health incident during the cooldown", async () => {
    const input = report();
    const model = client({});
    const decision = await decideMonitorAlert({
      report: input,
      client: model,
      now: NOW,
      incident: {
        number: 22,
        updatedAt: "2026-07-14T03:35:15.000Z",
        body: "<!-- agent-pulse-monitor:v1 -->\nCritical: production source coverage is low",
      },
    });

    expect(decision).toMatchObject({
      decision: "suppress",
      notify: false,
      decisionSource: "cooldown",
      reasonCode: "duplicate_within_cooldown",
    });
    expect(decision.cooldownUntil).toBe("2026-07-21T03:35:15.000Z");
    expect(model.completeJson).not.toHaveBeenCalled();
  });

  it("accepts a validated AI suppression for healthy shadow catalog mix", async () => {
    const model = client({
      decision: "suppress",
      confidence: 0.96,
      reasonCode: "expected_shadow_coverage",
      rationale:
        "The low active ratio comes from shadow inventory while audited sources remain healthy.",
      suggestedAction: "Review promotion criteria during routine source governance.",
    });

    const decision = await decideMonitorAlert({ report: report(), client: model, now: NOW });

    expect(decision).toMatchObject({
      decision: "suppress",
      decisionSource: "ai",
      reasonCode: "expected_shadow_coverage",
      ai: { consulted: true, model: "deepseek-v4-flash", confidence: 0.96 },
    });
  });

  it("requires at least 0.75 confidence for an AI alert", async () => {
    const model = client({
      decision: "alert",
      confidence: 0.7,
      reasonCode: "material_health_regression",
      rationale: "The production pool may be shrinking.",
      suggestedAction: "Inspect active sources.",
    });

    const decision = await decideMonitorAlert({ report: report(), client: model, now: NOW });

    expect(decision).toMatchObject({
      decision: "suppress",
      notify: false,
      decisionSource: "ai",
      reasonCode: "ai_low_confidence",
    });
  });

  it("keeps contextual failures in evidence when AI review fails", async () => {
    const model: JsonModelClient = {
      completeJson: vi
        .fn()
        .mockRejectedValue(Object.assign(new Error("unavailable"), { code: "timeout" })),
    };

    const decision = await decideMonitorAlert({ report: report(), client: model, now: NOW });

    expect(decision).toMatchObject({
      decision: "suppress",
      decisionSource: "fallback",
      reasonCode: "ai_review_failed",
      ai: { consulted: true, errorCode: "timeout" },
    });
  });

  it("runs a full decision in manual dry-run without sending a notification", async () => {
    const input = report({
      checks: {
        ...report().checks,
        site: { status: "critical", message: "Site unreachable", detail: {} },
      },
    });

    const decision = await decideMonitorAlert({ report: input, mode: "dry-run", now: NOW });

    expect(decision).toMatchObject({ decision: "alert", wouldNotify: true, notify: false });
  });

  it("uses a stable fingerprint for the same set of critical checks", () => {
    const first = report();
    const second = report({ systemScore: 65, issues: ["A differently worded source warning"] });

    expect(monitorFingerprint(first)).toBe(monitorFingerprint(second));
  });
});
