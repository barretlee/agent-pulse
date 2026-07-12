import { describe, expect, it } from "vitest";
import { capabilities, releases, roadmap } from "../src/catalog/product.js";
import { sourceCatalog } from "../src/catalog/sources.js";

describe("knowledge source catalog", () => {
  it("has at least 100 unique, classified and safe-by-default sources", () => {
    expect(sourceCatalog.length).toBeGreaterThanOrEqual(100);
    expect(new Set(sourceCatalog.map((source) => source.slug)).size).toBe(sourceCatalog.length);
    expect(() =>
      sourceCatalog.forEach((source) => {
        new URL(source.homepageUrl);
      }),
    ).not.toThrow();
    expect(new Set(sourceCatalog.map((source) => source.category)).size).toBeGreaterThanOrEqual(12);
    expect(sourceCatalog.filter((source) => source.region === "CN").length).toBeGreaterThanOrEqual(
      25,
    );
    expect(sourceCatalog.filter((source) => source.region !== "CN").length).toBeGreaterThanOrEqual(
      60,
    );
    expect(sourceCatalog.filter((source) => source.enabled).length).toBeLessThan(15);
    expect(
      sourceCatalog.filter((source) => source.maintenanceStatus === "restricted" && source.enabled),
    ).toHaveLength(0);
  });

  it("keeps the first-party release pool explicit and shadow-first", () => {
    const releaseSources = sourceCatalog.filter((source) => source.acquisition === "github");
    const chinaReleaseSources = releaseSources.filter((source) => source.region === "CN");

    expect(releaseSources.length).toBeGreaterThanOrEqual(70);
    expect(chinaReleaseSources.length).toBeGreaterThanOrEqual(20);
    expect(releaseSources.every((source) => source.adapter === "github-releases")).toBe(true);
    expect(releaseSources.every((source) => source.endpoint.endsWith("/releases.atom"))).toBe(true);
    expect(
      releaseSources.every((source) =>
        /^https:\/\/github\.com\/[^/]+\/[^/]+\/releases\.atom$/i.test(source.endpoint),
      ),
    ).toBe(true);
    expect(releaseSources.filter((source) => source.enabled)).toEqual([]);
    expect(releaseSources.every((source) => source.lifecycleStatus === "shadow")).toBe(true);
  });

  it("keeps roadmap and releases tied to capability evidence", () => {
    expect(roadmap).toHaveLength(5);
    expect(roadmap.every((state) => state.milestones.length >= 3)).toBe(true);
    expect(capabilities.length).toBeGreaterThanOrEqual(25);
    expect(capabilities.every((capability) => capability.evidence.length > 10)).toBe(true);
    expect(releases[0]?.capabilities.length).toBeGreaterThanOrEqual(5);
  });
});
