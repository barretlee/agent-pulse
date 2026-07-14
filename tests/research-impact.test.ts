import { describe, expect, it } from "vitest";
import type { PublicEvent } from "../src/domain/types.js";
import {
  assessResearchImpact,
  extractArxivId,
  type OpenAlexWorkMetrics,
  type ResearchImpactReport,
  reportIsStale,
  titleMatchScore,
} from "../src/pipeline/research-impact.js";

describe("research impact gate", () => {
  it("normalizes arXiv identities and rejects a mismatched paper title", () => {
    expect(extractArxivId("https://arxiv.org/abs/2302.13971v2")).toBe("2302.13971");
    expect(extractArxivId("https://doi.org/10.48550/arXiv.2302.13971")).toBe("2302.13971");
    expect(
      titleMatchScore(
        "LLaMA: Open and Efficient Foundation Language Models",
        "LLaMA: Open and Efficient Foundation Language Models",
      ),
    ).toBe(1);

    const assessment = assessResearchImpact(
      event("wrong-paper", "A Time Series is Worth 64 Words", "2302.13971"),
      work("LLaMA: Open and Efficient Foundation Language Models", 3_000, 900),
      "2026-07-14T00:00:00Z",
    );
    expect(assessment.qualified).toBe(false);
    expect(assessment.route).toBe("rejected");
    expect(assessment.reasons).toContain("paper_title_identity_mismatch");
  });

  it("requires established impact or strong recent citation velocity", () => {
    const established = assessResearchImpact(
      event(
        "llama",
        "LLaMA: Open and Efficient Foundation Language Models",
        "2302.13971",
        "2023-02-27T00:00:00Z",
      ),
      work("LLaMA: Open and Efficient Foundation Language Models", 3_000, 900, "2023-02-27"),
      "2026-07-14T00:00:00Z",
    );
    const accelerating = assessResearchImpact(
      event(
        "qwen",
        "Qwen3 Large Language Model Technical Report",
        "2505.09388",
        "2025-05-12T00:00:00Z",
      ),
      work("Qwen3 Large Language Model Technical Report", 87, 87, "2025-05-12"),
      "2026-07-14T00:00:00Z",
    );
    const watch = assessResearchImpact(
      event("new-paper", "A New Agent Benchmark", "2606.00001", "2026-06-01T00:00:00Z"),
      work("A New Agent Benchmark", 4, 4, "2026-06-01"),
      "2026-07-14T00:00:00Z",
    );

    expect(established.route).toBe("established-field-impact");
    expect(accelerating.route).toBe("accelerating-field-impact");
    expect(watch.qualified).toBe(false);
    expect(watch.route).toBe("watch");
  });

  it("fails closed when an impact report is older than two weeks", () => {
    const report = {
      schemaVersion: 1,
      policyVersion: "2026-07-14.v1",
      generatedAt: "2026-06-01T00:00:00Z",
      source: { name: "OpenAlex", url: "https://developers.openalex.org/" },
      assessments: [],
    } satisfies ResearchImpactReport;
    expect(reportIsStale(report, "2026-07-14T00:00:00Z")).toBe(true);
  });
});

function event(
  slug: string,
  title: string,
  arxivId: string,
  happenedAt = "2025-01-01T00:00:00Z",
): PublicEvent {
  return {
    id: slug,
    slug,
    title,
    factSummary: "A sufficiently detailed research fact summary.",
    summary: "A sufficiently detailed research summary.",
    technicalInsight: "Technical analysis.",
    industryInsight: "Industry analysis.",
    futureOutlook: "Future signals.",
    businessValue: "Decision value.",
    category: "research",
    company: "Research team",
    keywords: ["research"],
    confidenceScore: 90,
    heatScore: 0,
    impactScore: 90,
    valueScore: 90,
    scoreFactors: {
      authority: 0,
      corroboration: 0,
      primaryEvidence: 0,
      uniqueAuthors: 0,
      independentSources: 0,
      platformBreadth: 0,
      regionBreadth: 0,
      velocity: 0,
      freshness: 0,
      crossRegion: false,
    },
    featured: false,
    happenedAt,
    publishedAt: happenedAt,
    evidence: [
      {
        title: "Paper",
        url: `https://arxiv.org/abs/${arxivId}`,
        source: "arXiv",
        role: "primary",
        publishedAt: happenedAt,
      },
    ],
  };
}

function work(
  title: string,
  citedByCount: number,
  recentCitations: number,
  publicationDate = "2023-01-01",
): OpenAlexWorkMetrics {
  return {
    id: "https://openalex.org/W1",
    doi: null,
    title,
    publicationDate,
    citedByCount,
    recentCitations,
  };
}
