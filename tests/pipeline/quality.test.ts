import { describe, expect, it } from "vitest";
import type { CollectedSignal, SourceDescriptor } from "../../src/domain/types.js";
import { normalizeCollectedSignal, rejectSignal } from "../../src/pipeline/collect.js";
import { filterByQuality, scoreBatch, scoreSignal } from "../../src/pipeline/quality.js";

function makeSignal(overrides?: Partial<CollectedSignal>): CollectedSignal {
  return {
    externalId: "test-1",
    url: "https://example.com/article/1",
    title: "OpenAI Releases GPT-5 with Major Architecture Improvements",
    summary:
      "OpenAI announced GPT-5, featuring a new mixture-of-experts architecture that achieves 3x better reasoning performance while reducing inference costs by 40%. The model introduces native multimodal capabilities and a 2M token context window.",
    language: "en",
    publishedAt: new Date().toISOString(),
    category: "model-release",
    tags: ["OpenAI", "GPT-5", "foundation-model", "reasoning"],
    metrics: {
      platforms: ["official"],
      regions: ["US"],
      independentSources: 2,
    },
    rawMeta: { tier: 1 },
    ...overrides,
  };
}

function makeSource(
  overrides?: Partial<SourceDescriptor>,
): Pick<SourceDescriptor, "tier" | "role" | "authorityScore" | "region"> {
  return {
    tier: 1,
    role: "primary",
    authorityScore: 92,
    region: "US",
    ...overrides,
  };
}

describe("scoreSignal", () => {
  it("gives high score to high-quality primary source signal", () => {
    const result = scoreSignal(makeSignal(), makeSource());
    expect(result.total).toBeGreaterThanOrEqual(65);
    expect(["A", "B"]).toContain(result.grade);
  });

  it("gives A grade to excellent signal", () => {
    const signal = makeSignal({
      summary: "A".repeat(500),
      tags: ["AI", "GPT", "OpenAI", "reasoning", "multimodal"],
      author: "Sam Altman",
    });
    const result = scoreSignal(signal, makeSource());
    expect(result.total).toBeGreaterThanOrEqual(80);
    expect(result.grade).toBe("A");
  });

  it("penalizes thin content", () => {
    const signal = makeSignal({
      title: "News",
      summary: "Short.",
      tags: [],
    });
    const result = scoreSignal(signal, makeSource({ tier: 4, authorityScore: 40 }));
    expect(result.flags).toContain("thin-content");
    expect(result.flags).toContain("short-title");
    // Low grade due to thin content
    expect(["C", "D", "F"]).toContain(result.grade);
  });

  it("penalizes stale signals", () => {
    const signal = makeSignal({
      publishedAt: new Date(Date.now() - 30 * 86_400_000).toISOString(),
    });
    const result = scoreSignal(signal, makeSource());
    expect(result.flags).toContain("stale");
  });

  it("penalizes aggregator sources", () => {
    const signal = makeSignal({
      origin: { discoveryUrl: "https://aggregator.com", kind: "aggregator_story" },
    });
    const result = scoreSignal(signal, makeSource({ role: "heat", authorityScore: 50 }));
    expect(result.dimensions.originality).toBeLessThan(10);
  });

  it("detects missing metadata flags", () => {
    const signal = makeSignal({
      publishedAt: "invalid-date",
      category: "",
      tags: [],
    });
    const result = scoreSignal(signal, makeSource({ tier: 4, authorityScore: 30 }));
    expect(result.flags).toContain("no-tags");
  });
});

describe("scoreBatch", () => {
  it("returns correct summary statistics", () => {
    const signals = [
      makeSignal({
        title: "Excellent Article",
        summary: "A".repeat(600),
        tags: ["a", "b", "c", "d"],
      }),
      makeSignal({ title: "OK Article", summary: "B".repeat(100), tags: ["x"] }),
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

  it("handles empty input", () => {
    const { scores, summary } = scoreBatch([], makeSource());
    expect(scores).toHaveLength(0);
    expect(summary.total).toBe(0);
    expect(summary.avgScore).toBe(0);
  });
});

describe("filterByQuality", () => {
  it("filters out low-quality signals", () => {
    const signals = [
      makeSignal({
        title: "Good Signal With Rich Content",
        summary: "A".repeat(800),
        tags: ["a", "b", "c", "d"],
        author: "Expert Author",
      }),
      makeSignal({
        title: "Bd",
        summary: "x",
        tags: [],
        publishedAt: new Date(Date.now() - 90 * 86_400_000).toISOString(),
      }),
    ];
    const filtered = filterByQuality(signals, makeSource({ tier: 4, authorityScore: 30 }), "C");
    // Both signals from same low-tier source, but one is much better quality
    // The bad one should be filtered at C level
    expect(filtered.length).toBeGreaterThanOrEqual(1);
    expect(filtered[0]?.title).toBe("Good Signal With Rich Content");
  });

  it("keeps all signals with low threshold", () => {
    const signals = [
      makeSignal({ title: "Good", summary: "A".repeat(500), tags: ["a"] }),
      makeSignal({ title: "Bad", summary: "x", tags: [] }),
    ];
    const filtered = filterByQuality(signals, makeSource(), "F");
    expect(filtered).toHaveLength(2);
  });
});

describe("collection quality gate", () => {
  it("compacts and bounds collector text before persistence", () => {
    const normalized = normalizeCollectedSignal(
      makeSignal({
        title: `  Model\nrelease ${"x".repeat(600)}  `,
        summary: `Long\tarticle ${"y".repeat(2_500)}`,
        tags: [" model ", " model ", "release"],
      }),
    );

    expect(normalized.title.length).toBe(500);
    expect(normalized.summary.length).toBe(2_000);
    expect(normalized.title).not.toContain("\n");
    expect(normalized.tags).toEqual(["model", "release"]);
  });

  it("rejects challenge and captcha pages before they become events", () => {
    expect(
      rejectSignal(
        makeSignal({ title: "Sina Visitor System", summary: "请完成安全验证" }),
        makeSource(),
      ),
    ).toBe("block_page");
    expect(
      rejectSignal(makeSignal({ title: "验证码_哔哩哔哩", summary: "captcha" }), makeSource()),
    ).toBe("block_page");
  });

  it("rejects malformed URLs and dates", () => {
    expect(rejectSignal(makeSignal({ url: "/relative" }), makeSource())).toBe("invalid_url");
    expect(rejectSignal(makeSignal({ publishedAt: "not-a-date" }), makeSource())).toBe(
      "invalid_date",
    );
  });

  it("allows discovery-only metadata without applying factual quality thresholds", () => {
    const thin = makeSignal({ title: "AI", summary: "x", tags: [] });
    expect(rejectSignal(thin, makeSource({ role: "aggregator" }), true)).toBeNull();
  });
});
