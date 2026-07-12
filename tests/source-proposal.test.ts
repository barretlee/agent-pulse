import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { proposalToCatalogSource } from "../src/catalog/sources.js";
import {
  parseSourceProposalIssue,
  SOURCE_PROPOSAL_MARKER,
  upsertSourceProposal,
  validateAndNormalizeSourceProposal,
} from "../src/domain/source-proposal.js";

function proposalBody(overrides: Record<string, string> = {}): string {
  const values = {
    "Source name": "Example Research",
    "Canonical owner": "Example Foundation",
    "Official homepage URL": "https://research.example.org/",
    "Feed, API, or GitHub Releases URL": "https://research.example.org/feed.xml",
    Region: "GLOBAL",
    Language: "en",
    "Coverage category": "research-eval",
    "Source role": "research",
    "Acquisition surface": "rss",
    Topics: "evaluation, safety",
    "Expected cadence": "24h",
    "License, robots, and attribution":
      "Public metadata feed; preserve canonical links and publisher attribution.",
    "First-party evidence URLs": "https://research.example.org/about/",
    "Why should Agent Pulse track it?":
      "It publishes primary evaluation research that closes a documented evidence gap.",
    ...overrides,
  };
  return [
    SOURCE_PROPOSAL_MARKER,
    ...Object.entries(values).flatMap(([heading, value]) => [`### ${heading}`, "", value, ""]),
  ].join("\n");
}

describe("source proposal trust boundary", () => {
  it("parses the controlled issue form and normalizes a disabled catalog proposal", () => {
    const input = parseSourceProposalIssue(proposalBody());
    const result = validateAndNormalizeSourceProposal(input, 42, [], "2026-07-12T00:00:00.000Z");

    expect(result).toMatchObject({ valid: true, errors: [] });
    expect(result.proposal).toMatchObject({
      issueNumber: 42,
      slug: "example-research",
      acquisition: "rss",
      category: "research-eval",
    });
    expect(result.proposal).not.toHaveProperty("enabled");
    expect(result.proposal).not.toHaveProperty("lifecycleStatus");
    expect(result.proposal).not.toHaveProperty("adapter");
    expect(result.proposal).not.toHaveProperty("authorityScore");
    if (!result.proposal) throw new Error("Expected a normalized proposal");
    expect(proposalToCatalogSource(result.proposal)).toMatchObject({
      enabled: false,
      lifecycleStatus: "draft",
      maintenanceStatus: "proposal",
      qualityScore: 35,
    });
  });

  it("rejects credentials, HTTP, private hosts, query secrets, and non-standard ports", () => {
    const cases = [
      "http://research.example.org/feed.xml",
      "https://user:pass@research.example.org/feed.xml",
      "https://127.0.0.1/feed.xml",
      "https://8.8.8.8/feed.xml",
      "https://[::1]/feed.xml",
      "https://169.254.169.254/latest/meta-data",
      "https://research.example.org:8443/feed.xml",
      "https://research.example.org/feed.xml?token=secret",
    ];
    for (const endpoint of cases) {
      const input = parseSourceProposalIssue(
        proposalBody({ "Feed, API, or GitHub Releases URL": endpoint }),
      );
      expect(validateAndNormalizeSourceProposal(input, 42, []).valid, endpoint).toBe(false);
    }
  });

  it("treats GitHub as a shared host and deduplicates by exact repository identity", () => {
    const existing = [
      {
        slug: "existing-project",
        homepageUrl: "https://github.com/example/first",
        endpoint: "https://github.com/example/first/releases.atom",
      },
    ];
    const second = parseSourceProposalIssue(
      proposalBody({
        "Source name": "Second Project",
        "Official homepage URL": "https://github.com/example/second",
        "Feed, API, or GitHub Releases URL": "https://github.com/example/second/releases.atom",
        "Acquisition surface": "github",
      }),
    );
    const duplicate = parseSourceProposalIssue(
      proposalBody({
        "Source name": "First Project Releases",
        "Official homepage URL": "https://github.com/example/first",
        "Feed, API, or GitHub Releases URL": "https://github.com/example/first/releases.atom",
        "Acquisition surface": "github",
      }),
    );

    expect(validateAndNormalizeSourceProposal(second, 43, existing).valid).toBe(true);
    expect(validateAndNormalizeSourceProposal(duplicate, 44, existing)).toMatchObject({
      valid: false,
      errors: [expect.stringContaining("existing-project")],
    });
  });

  it("keeps imports idempotent by issue number", () => {
    const proposal = validateAndNormalizeSourceProposal(
      parseSourceProposalIssue(proposalBody()),
      42,
      [],
      "2026-07-12T00:00:00.000Z",
    ).proposal;
    if (!proposal) throw new Error("Expected a normalized proposal");
    const first = upsertSourceProposal([], proposal);
    const second = upsertSourceProposal(first.entries, proposal);
    expect(first.changed).toBe(true);
    expect(second.changed).toBe(false);
    expect(second.entries).toHaveLength(1);
  });

  it("keeps issue form headings synchronized with the parser", async () => {
    const form = await readFile(".github/ISSUE_TEMPLATE/source-proposal.yml", "utf8");
    for (const heading of [
      "Source name",
      "Canonical owner",
      "Official homepage URL",
      "Feed, API, or GitHub Releases URL",
      "License, robots, and attribution",
      "First-party evidence URLs",
    ]) {
      expect(form).toContain(`label: ${heading}`);
    }
    expect(form).toContain(SOURCE_PROPOSAL_MARKER);
  });
});
