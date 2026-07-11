import { describe, expect, it } from "vitest";
import { historicalEvents, industryNarratives } from "../src/catalog/history.js";
import { sourceCatalog } from "../src/catalog/sources.js";

describe("two-year industry history", () => {
  it("contains a dense, source-backed and non-aggregator milestone baseline", () => {
    const sourceBySlug = new Map(sourceCatalog.map((source) => [source.slug, source]));
    const slugs = new Set(historicalEvents.map((event) => event.slug));
    expect(historicalEvents.length).toBeGreaterThanOrEqual(30);
    expect(slugs.size).toBe(historicalEvents.length);
    for (const event of historicalEvents) {
      expect(event.date >= "2024-07-01").toBe(true);
      expect(event.date <= "2026-07-11T23:59:59.999Z").toBe(true);
      expect(new URL(event.url).protocol).toBe("https:");
      expect(sourceBySlug.get(event.source)?.role).not.toBe("aggregator");
      expect(event.scores[1]).toBe(0);
      expect(event.summary.length).toBeGreaterThan(30);
      expect(event.business.length).toBeGreaterThan(20);
    }
    expect(
      historicalEvents.filter((event) => event.tracks.includes("china-catch-up")).length,
    ).toBeGreaterThanOrEqual(6);
  });

  it("provides six executive narratives with staged China comparisons", () => {
    expect(industryNarratives.eras).toHaveLength(5);
    expect(industryNarratives.tracks).toHaveLength(6);
    expect(
      industryNarratives.tracks.every(
        (track) => track.stages.length >= 3 && track.stages.every((stage) => stage.chinaPosition),
      ),
    ).toBe(true);
  });
});
