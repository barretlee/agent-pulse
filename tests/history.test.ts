import { describe, expect, it } from "vitest";
import { capitalHistoryEvents } from "../src/catalog/capital-history-2023-2025.js";
import { directResearchHistory2026 } from "../src/catalog/direct-research-history-2026.js";
import { earlyHistoryEvents } from "../src/catalog/early-history.js";
import { ecosystemHistoryEvents } from "../src/catalog/ecosystem-history-2026-07.js";
import { historicalEvents, industryNarratives } from "../src/catalog/history.js";
import { recentDensityEvents } from "../src/catalog/recent-density.js";
import { sourceCatalog } from "../src/catalog/sources.js";
import { eventsForVendor, priorityVendorCoverage } from "../src/catalog/vendor-coverage.js";
import { vendorHistoryEvents } from "../src/catalog/vendor-history-2026-07.js";

describe("two-year industry history", () => {
  it("starts at the public generative AI turning point with first-party evidence", () => {
    const sourceBySlug = new Map(sourceCatalog.map((source) => [source.slug, source]));
    expect(earlyHistoryEvents.length).toBeGreaterThanOrEqual(12);
    expect(earlyHistoryEvents[0]?.date).toBe("2022-08-22T00:00:00.000Z");
    expect(earlyHistoryEvents.some((event) => event.slug === "chatgpt-research-preview")).toBe(
      true,
    );
    for (const milestone of earlyHistoryEvents) {
      expect(milestone.date >= "2022-08-01").toBe(true);
      expect(milestone.date < "2024-01-01").toBe(true);
      expect(sourceBySlug.get(milestone.source)?.role).not.toBe("aggregator");
      expect(new URL(milestone.url).protocol).toBe("https:");
      expect(milestone.scores[1]).toBe(0);
    }
  });

  it("contains a dense, source-backed and non-aggregator milestone baseline", () => {
    const sourceBySlug = new Map(sourceCatalog.map((source) => [source.slug, source]));
    const slugs = new Set(historicalEvents.map((event) => event.slug));
    expect(historicalEvents.length).toBeGreaterThanOrEqual(30);
    expect(slugs.size).toBe(historicalEvents.length);
    for (const event of historicalEvents) {
      expect(event.date >= "2022-11-01").toBe(true);
      expect(event.date <= "2026-07-14T23:59:59.999Z").toBe(true);
      expect(new URL(event.url).protocol).toBe("https:");
      expect(sourceBySlug.get(event.source)?.role).not.toBe("aggregator");
      expect(event.scores[1]).toBe(0);
      expect(event.summary.length).toBeGreaterThan(30);
      expect(event.business.length).toBeGreaterThan(20);
    }
    expect(
      historicalEvents.filter((event) => event.tracks.includes("global-innovation")).length,
    ).toBeGreaterThanOrEqual(6);
  });

  it("backs every completed 2026 month with a directly published research package", () => {
    const months = directResearchHistory2026.map((event) => event.date.slice(0, 7));
    const directSources = new Set(["microsoft-research", "openai", "anthropic", "google-research"]);

    expect(months).toEqual([
      "2026-01",
      "2026-02",
      "2026-03",
      "2026-04",
      "2026-05",
      "2026-06",
      "2026-07",
    ]);
    expect(directResearchHistory2026.every((event) => directSources.has(event.source))).toBe(true);
    expect(directResearchHistory2026.every((event) => event.category === "research")).toBe(true);
  });

  it("keeps every priority model vendor connected to sources and searchable events", () => {
    const sourceSlugs = new Set(sourceCatalog.map((source) => source.slug));

    expect(priorityVendorCoverage).toHaveLength(22);
    expect(priorityVendorCoverage.filter((vendor) => vendor.region === "CN")).toHaveLength(14);
    for (const vendor of priorityVendorCoverage) {
      expect(vendor.sourceSlugs.length, vendor.name).toBeGreaterThanOrEqual(2);
      for (const sourceSlug of vendor.sourceSlugs) {
        expect(sourceSlugs.has(sourceSlug), `${vendor.name}: ${sourceSlug}`).toBe(true);
      }
      expect(eventsForVendor(historicalEvents, vendor).length, vendor.name).toBeGreaterThan(0);
    }
  });

  it("adds a broad first-party vendor milestone baseline, not two isolated patches", () => {
    const sourceBySlug = new Map(sourceCatalog.map((source) => [source.slug, source]));
    const additions = [...vendorHistoryEvents, ...ecosystemHistoryEvents];

    expect(vendorHistoryEvents).toHaveLength(18);
    expect(ecosystemHistoryEvents).toHaveLength(14);
    expect(additions).toHaveLength(32);
    expect(new Set(additions.map((event) => event.slug)).size).toBe(32);
    for (const event of additions) {
      expect(event.keywords.length).toBeGreaterThanOrEqual(4);
      expect(event.scores[1]).toBe(0);
      expect(new URL(event.url).protocol).toBe("https:");
      expect(sourceBySlug.get(event.source)?.tier).toBe(1);
      expect(sourceBySlug.get(event.source)?.role).not.toBe("aggregator");
    }
  });

  it("fills the capital track with first-party funding and company milestones", () => {
    const sourceBySlug = new Map(sourceCatalog.map((source) => [source.slug, source]));
    const allEvents = [...earlyHistoryEvents, ...historicalEvents, ...recentDensityEvents];
    const capitalEvents = allEvents.filter((event) => event.tracks.includes("investing"));

    expect(capitalHistoryEvents).toHaveLength(10);
    expect(new Set(capitalHistoryEvents.map((event) => event.slug)).size).toBe(10);
    expect(capitalEvents.length).toBeGreaterThanOrEqual(21);
    for (const event of capitalHistoryEvents) {
      expect(event.tracks).toContain("investing");
      expect(event.scores[1]).toBe(0);
      expect(new URL(event.url).protocol).toBe("https:");
      expect(sourceBySlug.get(event.source)).toMatchObject({ tier: 1, role: "primary" });
      expect(event.fact.length).toBeGreaterThan(30);
      expect(event.industry.length).toBeGreaterThan(30);
      expect(event.business.length).toBeGreaterThan(30);
    }
  });

  it("provides six executive narratives with real phase ranges and decision lenses", () => {
    expect(industryNarratives.horizon.start).toBe("2022-08-22");
    expect(industryNarratives.eras).toHaveLength(6);
    expect(
      industryNarratives.eras.some((era) =>
        era.projects.some((project) => project.status !== "active"),
      ),
    ).toBe(true);
    for (const era of industryNarratives.eras) {
      expect(era.projects.length).toBeGreaterThanOrEqual(2);
      for (const project of era.projects) expect(new URL(project.url).protocol).toBe("https:");
    }
    expect(industryNarratives.tracks).toHaveLength(6);
    const phaseCounts = new Set(industryNarratives.tracks.map((track) => track.stages.length));
    expect(phaseCounts.size).toBeGreaterThan(1);
    for (const track of industryNarratives.tracks) {
      expect(track.stages.length).toBeGreaterThanOrEqual(5);
      expect(track.stages.length).toBeLessThanOrEqual(8);
      expect(track.lenses).toHaveLength(4);
      expect(new Set(track.lenses.map((lens) => lens.role)).size).toBe(4);
      for (const stage of track.stages) {
        expect(stage.start).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        expect(stage.end).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        expect(stage.start <= stage.end).toBe(true);
        expect(stage.interpretation.length).toBeGreaterThan(20);
        expect(stage.chinaPosition.length).toBeGreaterThan(15);
        expect(stage.nextSignal.length).toBeGreaterThan(15);
      }
      for (const lens of track.lenses) {
        expect(lens.answer.length).toBeGreaterThan(40);
        expect(lens.implications.length).toBeGreaterThanOrEqual(2);
        expect(lens.actions.length).toBeGreaterThanOrEqual(2);
        expect(lens.watch.length).toBeGreaterThanOrEqual(2);
        expect(lens.evidenceSlugs.length).toBeGreaterThanOrEqual(3);
      }
    }
  });
});
