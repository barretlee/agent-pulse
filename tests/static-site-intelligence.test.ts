import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { sourceCatalog } from "../src/catalog/sources.js";
import { githubReleasesAdapter } from "../src/collectors/github-releases.js";
import { rssAdapter } from "../src/collectors/rss.js";
import type { CollectContext } from "../src/collectors/types.js";
import type { SourceDescriptor } from "../src/domain/types.js";
import type {
  EnrichedEvent,
  NarrativeStage,
  PublicSource,
  StaticSiteModel,
} from "../src/pipeline/static-site/dto.js";
import {
  analyzeTechnologyCoverage,
  eventDevelopments,
  eventTouchesNarrativeStage,
  evidenceForNarrativeStage,
  groupEventsByYearMonth,
  groupTimelineMonthItems,
  isHighImpactTimelineResearch,
  isRecentEvent,
  isTimelineResearchEvent,
  latestNarrativeStageDevelopmentAt,
  recentMonthlyDensity,
  recentResearchBatches,
  sortEventsByLatestDevelopment,
  summarizeSourcePortfolio,
  timelineEventsForPresentation,
} from "../src/pipeline/static-site/intelligence.js";
import { renderTimeline } from "../src/pipeline/static-site/pages.js";

describe("static-site intelligence consumption model", () => {
  it("sorts one event per card by its latest evidence update", () => {
    const olderEventWithNewUpdate = event("older", "2026-01-01T00:00:00Z", [
      evidence("Official update", "primary", "2026-07-10T00:00:00Z"),
    ]);
    const newerEvent = event("newer", "2026-07-01T00:00:00Z", [
      evidence("Initial report", "secondary", "2026-07-01T00:00:00Z"),
    ]);

    expect(
      sortEventsByLatestDevelopment([newerEvent, olderEventWithNewUpdate]).map((item) => item.slug),
    ).toEqual(["older", "newer"]);
  });

  it("associates incremental evidence with its real stage without rewriting the event origin", () => {
    const originStage = stage("2025-01-01", "2025-12-31");
    const currentStage = stage("2026-01-01", "9999-12-31");
    const item = event("long-running-shift", "2025-06-01T00:00:00Z", [
      evidence("Initial release", "primary", "2025-06-01T00:00:00Z"),
      evidence("Incremental adoption", "secondary", "2026-07-13T00:00:00Z"),
    ]);

    expect(eventTouchesNarrativeStage(item, originStage)).toBe(true);
    expect(eventTouchesNarrativeStage(item, currentStage)).toBe(true);
    expect(evidenceForNarrativeStage(item, originStage).map((item) => item.title)).toEqual([
      "Initial release",
    ]);
    expect(evidenceForNarrativeStage(item, currentStage).map((item) => item.title)).toEqual([
      "Incremental adoption",
    ]);
    expect(latestNarrativeStageDevelopmentAt(item, currentStage)).toBe("2026-07-13T00:00:00.000Z");

    const futureEvidence = evidence("Future validation", "secondary", "2027-02-01T00:00:00Z");
    item.evidence.push(futureEvidence);
    expect(evidenceForNarrativeStage(item, currentStage)).toContain(futureEvidence);
    expect(latestNarrativeStageDevelopmentAt(item, currentStage)).toBe("2027-02-01T00:00:00.000Z");
  });

  it("turns evidence into a chronological event development path", () => {
    const item = event("journey", "2026-07-01T00:00:00Z", [
      evidence("Community response", "amplification", "2026-07-03T00:00:00Z"),
      evidence("Initial report", "secondary", "2026-07-01T00:00:00Z"),
      evidence("Official release", "primary", "2026-07-02T00:00:00Z"),
    ]);

    const developments = eventDevelopments(item);
    expect(developments.map((development) => development.kind)).toEqual([
      "origin",
      "official",
      "discussion",
    ]);
    expect(developments.map((development) => development.evidence.title)).toEqual([
      "Initial report",
      "Official release",
      "Community response",
    ]);
  });

  it("groups event stories into descending year and month sections", () => {
    const events = [
      event("july", "2026-07-01T00:00:00Z", []),
      event("june", "2026-06-30T00:00:00Z", []),
      event("older", "2025-12-01T00:00:00Z", []),
    ];

    const chronology = groupEventsByYearMonth(events);

    expect(chronology.map((group) => group.year)).toEqual([2026, 2025]);
    expect(chronology[0]?.months.map((month) => month.key)).toEqual(["2026-07", "2026-06"]);
    expect(chronology[0]?.months[0]?.events.map((item) => item.slug)).toEqual(["july"]);
  });

  it("aggregates high-impact research from the whole month without losing events", () => {
    const research = [
      researchEvent("paper-1", "2026-07-01T08:00:00Z"),
      researchEvent("paper-2", "2026-07-09T08:00:00Z"),
      researchEvent("paper-3", "2026-07-21T08:00:00Z"),
      researchEvent("paper-4", "2026-07-29T08:00:00Z"),
    ];
    const product = event("product", "2026-07-09T07:00:00Z", []);
    const firstResearch = research[0];
    if (!firstResearch) throw new Error("research fixture missing");
    const items = groupTimelineMonthItems([firstResearch, product, ...research.slice(1)]);

    expect(items).toHaveLength(2);
    expect(items[0]).toEqual({ kind: "event", event: product });
    expect(items[1]).toMatchObject({
      kind: "research-month",
      key: "2026-07",
      events: expect.arrayContaining(research),
    });
  });

  it("caps a monthly research group at the 10 highest-weight papers", () => {
    const research = Array.from({ length: 15 }, (_, index) => ({
      ...researchEvent(`paper-${index}`, "2026-07-09T08:00:00Z"),
      impactScore: 75 + index / 2,
    }));
    const group = groupTimelineMonthItems(research).find((item) => item.kind === "research-month");

    expect(group?.events).toHaveLength(10);
    expect(group?.events[0]?.slug).toBe("paper-14");
    expect(group?.events.map((item) => item.slug)).not.toContain("paper-0");
  });

  it("keeps low-impact papers out of the timeline without changing their event", () => {
    const paper = {
      ...researchEvent("thin-paper", "2026-07-09T08:00:00Z"),
      impactScore: 55,
      valueScore: 58,
    };
    const product = event("product", "2026-07-09T07:00:00Z", []);

    expect(isTimelineResearchEvent(paper)).toBe(true);
    expect(isHighImpactTimelineResearch(paper)).toBe(false);
    expect(timelineEventsForPresentation([paper, product])).toEqual([product]);
    expect(groupTimelineMonthItems([paper, product])).toEqual([{ kind: "event", event: product }]);
  });

  it("recognizes arXiv papers with specific categories and ranks confidence before language", () => {
    const arxivPaper = researchEvent("arxiv-paper", "2026-07-09T08:00:00Z");
    arxivPaper.category = "benchmark";
    const chinese = { ...event("中文事件", "2026-07-09T08:00:00Z", []), title: "中文事件" };
    const english = {
      ...event("English event", "2026-07-09T08:00:00Z", []),
      confidenceScore: 91,
    };
    const highImpactButLowerConfidence = {
      ...english,
      slug: "high-impact-lower-confidence",
      impactScore: 100,
      valueScore: 100,
      confidenceScore: 90,
      heatScore: 90,
    };

    expect(isTimelineResearchEvent(arxivPaper)).toBe(true);
    const regularSlugs = (items: ReturnType<typeof groupTimelineMonthItems>) =>
      items.filter((item) => item.kind === "event").map((item) => item.event.slug);
    expect(regularSlugs(groupTimelineMonthItems([english, chinese]))).toEqual([
      "English event",
      "中文事件",
    ]);
    expect(regularSlugs(groupTimelineMonthItems([english, highImpactButLowerConfidence]))).toEqual([
      "English event",
      "high-impact-lower-confidence",
    ]);
  });

  it("does not count the monthly research group against six visible regular events", () => {
    const regular = Array.from({ length: 7 }, (_, index) =>
      event(`regular-${index}`, `2026-07-${String(index + 1).padStart(2, "0")}T08:00:00Z`, []),
    );
    const model = {
      events: [...regular, researchEvent("paper", "2026-07-15T08:00:00Z")],
      tracks: [],
    } as unknown as StaticSiteModel;
    const page = renderTimeline(model, "zh-CN");

    expect(page).toContain('data-research-month="2026-07"');
    expect(page.match(/data-month-extra="true"/g)).toHaveLength(1);
    expect(page).toContain('data-timeline-item-count="7"');
  });

  it("lazy-mounts month groups only after the public Event total exceeds 500", () => {
    const manyEvents = Array.from({ length: 501 }, (_, index) => {
      const month = 11 - (index % 12);
      return event(
        `event-${index}`,
        new Date(Date.UTC(2026, month, 1 + (index % 20), 8)).toISOString(),
        [],
      );
    });
    const model = { events: manyEvents, tracks: [] } as unknown as StaticSiteModel;
    const lazyPage = renderTimeline(model, "zh-CN");
    const regularPage = renderTimeline({ ...model, events: manyEvents.slice(0, 500) }, "zh-CN");

    expect(lazyPage).toContain('data-timeline-lazy="true"');
    expect(lazyPage.match(/data-timeline-month-template/g)).toHaveLength(6);
    expect(lazyPage).toContain("data-timeline-month-toggle");
    expect(lazyPage).toContain('data-month-extra="true"');
    expect(regularPage).toContain('data-timeline-lazy="false"');
    expect(regularPage).not.toContain("data-timeline-month-template");
  });

  it("highlights only events from the previous seven days", () => {
    expect(isRecentEvent(event("recent", "2026-07-10T00:00:00Z", []), "2026-07-13T00:00:00Z")).toBe(
      true,
    );
    expect(isRecentEvent(event("old", "2026-07-01T00:00:00Z", []), "2026-07-13T00:00:00Z")).toBe(
      false,
    );
    expect(isRecentEvent(event("future", "2026-07-14T00:00:00Z", []), "2026-07-13T00:00:00Z")).toBe(
      false,
    );
  });

  it("reports recent month density without treating the current partial month as a gap", () => {
    const events = [
      ...Array.from({ length: 8 }, (_, index) =>
        event(`july-${index}`, "2026-07-10T00:00:00Z", []),
      ),
      ...Array.from({ length: 6 }, (_, index) =>
        event(`june-${index}`, "2026-06-10T00:00:00Z", []),
      ),
      ...Array.from({ length: 3 }, (_, index) => event(`may-${index}`, "2026-05-10T00:00:00Z", [])),
    ];
    expect(recentMonthlyDensity(events, "2026-07-13T00:00:00Z")).toEqual([
      { key: "2026-07", count: 8, target: 6, status: "in-progress" },
      { key: "2026-06", count: 6, target: 6, status: "balanced" },
      { key: "2026-05", count: 3, target: 6, status: "gap" },
    ]);
  });

  it("explains weekend research gaps instead of fabricating paper events", () => {
    const arxivEvidence = evidence("Paper", "primary", "2026-07-11T04:00:00Z");
    arxivEvidence.url = "https://arxiv.org/abs/2607.00001";
    const paper = {
      ...event("paper", "2026-07-11T04:00:00Z", [arxivEvidence]),
      category: "research",
    };
    expect(recentResearchBatches([paper], "2026-07-13T00:30:00Z")).toEqual([
      { day: "2026-07-13", count: 0, status: "waiting" },
      { day: "2026-07-12", count: 0, status: "weekend" },
      { day: "2026-07-11", count: 1, status: "published" },
    ]);
  });

  it("keeps catalog presence separate from effective technical coverage", () => {
    const sources = [
      source("claude-code-releases", "Claude Code Releases", "healthy", "github", [
        "coding-agent",
        "developer",
      ]),
      source("anthropic", "Anthropic", "failed", "html", ["agent", "enterprise"]),
      source("lovable-changelog", "Lovable Changelog", "unchecked", "rss", ["lovable", "product"]),
    ];

    const coverage = analyzeTechnologyCoverage(sources);
    expect(coverage.find((item) => item.slug === "claude-code")).toMatchObject({
      status: "watch",
      healthySources: 1,
    });
    expect(coverage.find((item) => item.slug === "lovable")).toMatchObject({
      status: "unchecked",
      healthySources: 0,
    });
    expect(coverage.find((item) => item.slug === "a2a")).toMatchObject({ status: "gap" });
  });

  it("summarizes the source portfolio without confusing catalog size with health", () => {
    const sources = [
      {
        ...source("cn-agent", "China Agent", "healthy", "github", ["agent"]),
        region: "CN",
      },
      {
        ...source("global-feed", "Global Feed", "failed", "rss", ["research"]),
        category: "research-eval",
      },
      {
        ...source("observing-feed", "Observing Feed", "healthy", "rss", ["policy"]),
        category: "policy",
        observationEnabled: true,
      },
    ];
    const portfolio = summarizeSourcePortfolio(sources);

    expect(portfolio.acquisitions).toEqual([
      { key: "rss", total: 2, healthy: 1, observing: 1 },
      { key: "github", total: 1, healthy: 1, observing: 0 },
    ]);
    expect(portfolio.health).toEqual([
      { key: "healthy", total: 2, healthy: 2, observing: 1 },
      { key: "failed", total: 1, healthy: 0, observing: 0 },
    ]);
    for (const dimension of [
      portfolio.categories,
      portfolio.regions,
      portfolio.acquisitions,
      portfolio.health,
    ]) {
      expect(dimension.reduce((sum, bucket) => sum + bucket.total, 0)).toBe(sources.length);
    }
  });
});

describe("new first-party technology source fixtures", () => {
  it("parses the A2A release fixture through the configured GitHub adapter", async () => {
    const catalog = sourceCatalog.find((source) => source.slug === "a2a-protocol-releases");
    expect(catalog).toMatchObject({
      adapter: "github-releases",
      lifecycleStatus: "shadow",
      enabled: false,
    });
    const result = await githubReleasesAdapter.collect(
      descriptor(catalog),
      context(await fixture("a2a-releases.atom"), catalog?.endpoint ?? ""),
    );
    expect(result[0]).toMatchObject({
      title: "v1.0.1",
      url: "https://github.com/a2aproject/A2A/releases/tag/v1.0.1",
    });
  });

  it("parses the Lovable changelog fixture through the configured RSS adapter", async () => {
    const catalog = sourceCatalog.find((source) => source.slug === "lovable-changelog");
    expect(catalog).toMatchObject({ adapter: "rss", lifecycleStatus: "shadow", enabled: false });
    const result = await rssAdapter.collect(
      descriptor(catalog),
      context(await fixture("lovable-changelog.xml"), catalog?.endpoint ?? ""),
    );
    expect(result[0]).toMatchObject({
      title: "Add payments to your app",
      publishedAt: "2026-04-24T00:00:00.000Z",
    });
  });

  it("keeps source schema drift out of normalized signals", async () => {
    const drift = await fixture("source-schema-drift.xml");
    const lovable = sourceCatalog.find((source) => source.slug === "lovable-changelog");
    const a2a = sourceCatalog.find((source) => source.slug === "a2a-protocol-releases");

    expect(
      await rssAdapter.collect(descriptor(lovable), context(drift, lovable?.endpoint ?? "")),
    ).toEqual([]);
    await expect(
      githubReleasesAdapter.collect(descriptor(a2a), context(drift, a2a?.endpoint ?? "")),
    ).rejects.toThrow("no entries found");
  });

  it.each([
    "baoyu",
    "mu-li-blog",
    "lilian-weng",
    "eugene-yan",
  ])("parses the %s expert feed through the RSS contract", async (slug) => {
    const catalog = sourceCatalog.find((source) => source.slug === slug);
    expect(catalog).toMatchObject({ adapter: "rss", role: "expert", lifecycleStatus: "shadow" });
    const result = await rssAdapter.collect(
      descriptor(catalog),
      context(await fixture("expert-feed.xml"), catalog?.endpoint ?? ""),
    );
    expect(result[0]?.title).toBe("A durable AI systems field note");
  });
});

function event(
  slug: string,
  happenedAt: string,
  evidenceItems: EnrichedEvent["evidence"],
): EnrichedEvent {
  return {
    id: slug,
    slug,
    title: slug,
    factSummary: "Verified fact",
    summary: "Context",
    technicalInsight: "Technical change",
    industryInsight: "Industry impact",
    futureOutlook: "Next signal",
    businessValue: "Decision value",
    category: "product",
    company: "Example",
    keywords: [],
    confidenceScore: 80,
    heatScore: 60,
    impactScore: 70,
    valueScore: 75,
    scoreFactors: {
      authority: 80,
      corroboration: 70,
      primaryEvidence: 1,
      uniqueAuthors: 1,
      independentSources: 1,
      platformBreadth: 1,
      regionBreadth: 1,
      velocity: 1,
      freshness: 1,
      crossRegion: false,
    },
    featured: false,
    happenedAt,
    publishedAt: happenedAt,
    evidence: evidenceItems,
    tracks: [],
    actors: [],
  };
}

function researchEvent(slug: string, happenedAt: string): EnrichedEvent {
  const primary = evidence("Research preprint", "primary", happenedAt);
  primary.url = `https://arxiv.org/abs/${slug}`;
  return {
    ...event(slug, happenedAt, [primary]),
    category: "research-paper",
    confidenceScore: 88,
    impactScore: 84,
    valueScore: 82,
    technicalInsight:
      "The paper defines a reproducible method, comparison baseline, evaluation protocol, and measurable result that changes a technical capability boundary.",
    industryInsight:
      "The result can change product architecture, evaluation practice, and the competitive position of teams building in this domain.",
    futureOutlook:
      "Watch independent reproduction, deployment cost, failure cases, and whether the result transfers to real production workloads.",
    researchImpact: {
      eventSlug: slug,
      arxivId: "2607.00001",
      paperTitle: slug,
      openAlexId: "https://openalex.org/W1",
      citedByCount: 240,
      recentCitations: 90,
      titleMatchScore: 1,
      topicRelevant: true,
      publicationDate: happenedAt.slice(0, 10),
      publicationDateDeltaDays: 0,
      qualified: true,
      route: "established-field-impact",
      reasons: ["test_fixture"],
      evidenceUrls: ["https://openalex.org/W1"],
    },
  };
}

function evidence(
  title: string,
  role: string,
  publishedAt: string,
): EnrichedEvent["evidence"][number] {
  return {
    title,
    role,
    publishedAt,
    source: `${title} source`,
    url: `https://example.com/${title.toLowerCase().replaceAll(" ", "-")}`,
  };
}

function stage(start: string, end: string): NarrativeStage {
  return {
    start,
    end,
    period: `${start} — ${end}`,
    label: "Stage",
    summary: "Summary",
    interpretation: "Interpretation",
    chinaPosition: "China position",
    nextSignal: "Next signal",
  };
}

function source(
  slug: string,
  name: string,
  healthStatus: PublicSource["healthStatus"],
  acquisition: string,
  topics: string[],
): PublicSource {
  return {
    slug,
    name,
    homepageUrl: `https://example.com/${slug}`,
    category: "agent-devtool",
    region: "GLOBAL",
    tier: 1,
    role: "primary",
    acquisition,
    topics,
    maintenanceStatus: "candidate",
    lifecycle: "shadow",
    observationEnabled: false,
    qualityScore: 80,
    cadence: "daily",
    healthStatus,
    lastCheckedAt: healthStatus === "unchecked" ? null : "2026-07-12T00:00:00Z",
    latestItemAt: healthStatus === "healthy" ? "2026-07-11T00:00:00Z" : null,
    healthErrorCode: healthStatus === "failed" ? "INVALID_ITEMS" : null,
  };
}

function descriptor(source: (typeof sourceCatalog)[number] | undefined): SourceDescriptor {
  if (!source) throw new Error("Expected source fixture entry");
  return {
    id: source.slug,
    slug: source.slug,
    name: source.name,
    homepageUrl: source.homepageUrl,
    adapter: source.adapter,
    tier: source.tier,
    role: source.role,
    region: source.region,
    language: source.language,
    authorityScore: source.authorityScore,
    config: { url: source.endpoint, category: source.category, take: 10 },
    state: {},
  };
}

function context(body: string, finalUrl: string): CollectContext {
  return {
    config: {
      NODE_ENV: "test",
      HOST: "127.0.0.1",
      PORT: 8899,
      DATABASE_URL: "sqlite::memory:",
      COLLECTOR_USER_AGENT: "agent-pulse/test",
      COLLECTOR_TIMEOUT_MS: 30_000,
      COLLECTOR_CONCURRENCY: 4,
      COLLECTOR_PROXY_MODE: "off",
      PUBLIC_SITE_URL: "https://example.com",
      DEEPSEEK_BASE_URL: "https://api.deepseek.com",
      DEEPSEEK_MODEL: "deepseek-v4-flash",
      AI_ENRICHMENT_ENABLED: false,
      AI_ENRICHMENT_MAX_EVENTS: 8,
      AI_ENRICHMENT_TIMEOUT_MS: 60_000,
      AI_STAGE_PROMOTION_ENABLED: false,
      DEEPSEEK_STAGE_MODEL: "deepseek-v4-pro",
      AI_STAGE_PROMOTION_TIMEOUT_MS: 120_000,
      rootDir: "/tmp",
      databaseUrl: "sqlite::memory:",
      distDir: "/tmp/dist",
    },
    fetchText: async () => ({
      body,
      status: 200,
      headers: new Headers(),
      attemptCount: 1,
      responseBytes: body.length,
      finalUrl,
    }),
  };
}

async function fixture(name: string): Promise<string> {
  return readFile(join(process.cwd(), "tests/fixtures/sources", name), "utf8");
}
