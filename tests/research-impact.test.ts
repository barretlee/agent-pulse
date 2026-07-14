import { describe, expect, it } from "vitest";
import type { PublicEvent } from "../src/domain/types.js";
import {
  assessResearchImpact,
  auditedOverrideIsValid,
  extractArxivId,
  type OpenAlexWorkMetrics,
  type ResearchImpactReport,
  reportIsStale,
  researchCoverageForCompletedMonths,
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

  it("admits recent research through an audited direct-source evidence package", () => {
    const direct = {
      route: "direct-source-significance" as const,
      reason: "official_research_page_plus_full_paper_and_open_source_artifact",
      evidenceUrls: ["https://research.example/paper", "https://github.com/example/paper"],
      reviewedAt: "2026-07-14T00:00:00Z",
      validUntil: "2027-01-01T00:00:00Z",
      invalidatesWhen:
        "The paper is withdrawn or the official implementation no longer supports the result.",
    };
    const recent = event("direct", "A New Agent Benchmark", "", "2026-07-01T00:00:00Z");
    recent.evidence = [
      {
        title: "Official research publication",
        url: "https://research.example/paper",
        source: "Official Research",
        role: "primary",
        publishedAt: recent.happenedAt,
      },
    ];

    expect(auditedOverrideIsValid(direct, "2026-07-14T00:00:00Z")).toBe(true);
    expect(assessResearchImpact(recent, null, "2026-07-14T00:00:00Z", direct)).toMatchObject({
      qualified: true,
      route: "direct-source-significance",
      reviewedAt: direct.reviewedAt,
      validUntil: direct.validUntil,
    });
    expect(auditedOverrideIsValid(direct, "2027-02-01T00:00:00Z")).toBe(false);
  });

  it("fails closed when an impact report is older than two weeks", () => {
    const report = {
      schemaVersion: 1,
      policyVersion: "2026-07-14.v2",
      generatedAt: "2026-06-01T00:00:00Z",
      source: { name: "OpenAlex", url: "https://developers.openalex.org/" },
      assessments: [],
    } satisfies ResearchImpactReport;
    expect(reportIsStale(report, "2026-07-14T00:00:00Z")).toBe(true);
  });

  it("detects two consecutive completed months without qualified research", () => {
    const events = [
      event("january", "January Agent Research", "2601.00001", "2026-01-10T00:00:00Z"),
      event("april", "April Agent Research", "2604.00001", "2026-04-10T00:00:00Z"),
    ];
    const assessments = events.map((item) => ({
      ...assessResearchImpact(
        item,
        work(item.title, 0, 0, item.happenedAt.slice(0, 10)),
        "2026-07-14T00:00:00Z",
      ),
      qualified: true,
    }));

    expect(researchCoverageForCompletedMonths(events, assessments, "2026-07-14T00:00:00Z")).toEqual(
      {
        completedMonths: [
          { month: "2026-01", qualified: 1 },
          { month: "2026-02", qualified: 0 },
          { month: "2026-03", qualified: 0 },
          { month: "2026-04", qualified: 1 },
          { month: "2026-05", qualified: 0 },
          { month: "2026-06", qualified: 0 },
        ],
        maxConsecutiveEmptyMonths: 2,
      },
    );
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
