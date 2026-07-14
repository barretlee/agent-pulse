import { describe, expect, it } from "vitest";
import { capitalEvidenceSources20260714 } from "../src/catalog/capital-evidence-sources-2026-07.js";
import { ecosystemEvidenceSources20260714 } from "../src/catalog/ecosystem-evidence-sources-2026-07.js";
import { influencerCatalog } from "../src/catalog/influencers.js";
import { capabilities, releases, roadmap } from "../src/catalog/product.js";
import { sourceExpansionWave20260713 } from "../src/catalog/source-expansion-2026-07.js";
import { sourceCatalog } from "../src/catalog/sources.js";
import { vendorEvidenceSources20260714 } from "../src/catalog/vendor-evidence-sources-2026-07.js";

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

  it("adds official macro and filing sources without activating unverified collectors", () => {
    const supplementalSlugs = [
      "fred",
      "alfred",
      "imf-weo",
      "bis-credit-gaps",
      "bls-public-data",
      "bea-api",
      "us-treasury-fiscal-data",
      "ecb-data-portal",
      "nbs-china",
      "pboc-statistics",
      "oecd-data-explorer",
      "world-bank-indicators",
      "eurostat-data",
      "sec-edgar",
      "cninfo",
      "sse-announcements",
      "szse-announcements",
      "nasdaq-data-link",
    ];
    const supplemental = sourceCatalog.filter((source) => supplementalSlugs.includes(source.slug));

    expect(supplemental).toHaveLength(supplementalSlugs.length);
    expect(supplemental.every((source) => source.tier === 1)).toBe(true);
    expect(supplemental.every((source) => !source.enabled)).toBe(true);
    expect(supplemental.every((source) => source.lifecycleStatus === "shadow")).toBe(true);
    expect(
      supplemental.every((source) =>
        ["candidate", "manual", "restricted"].includes(source.maintenanceStatus),
      ),
    ).toBe(true);
    expect(
      supplemental
        .filter((source) => source.region === "CN")
        .every((source) => source.acquisition === "manual"),
    ).toBe(true);
    expect(sourceCatalog.find((source) => source.slug === "nasdaq-data-link")).toMatchObject({
      maintenanceStatus: "restricted",
      enabled: false,
    });
  });

  it("adds exactly 100 diverse wave-2 sources behind the shadow gate", () => {
    const wave = sourceExpansionWave20260713;

    expect(wave).toHaveLength(100);
    expect(new Set(wave.map((source) => source.slug)).size).toBe(100);
    expect(new Set(wave.map((source) => source.endpoint)).size).toBe(100);
    expect(wave.filter((source) => source.acquisition === "github")).toHaveLength(80);
    expect(wave.filter((source) => source.acquisition === "rss")).toHaveLength(20);
    expect(wave.filter((source) => source.region === "CN").length).toBeGreaterThanOrEqual(15);
    expect(wave.filter((source) => source.category === "robotics")).toHaveLength(10);
    expect(
      wave.filter((source) => source.category === "agent-devtool").length,
    ).toBeGreaterThanOrEqual(25);
    expect(
      wave.filter((source) =>
        ["research-eval", "open-source", "infra-chip-cloud"].includes(source.category),
      ).length,
    ).toBeGreaterThanOrEqual(25);
    expect(wave.every((source) => source.enabled === false)).toBe(true);
    expect(wave.every((source) => source.lifecycleStatus === "shadow")).toBe(true);
    expect(wave.every((source) => source.maintenanceStatus === "candidate")).toBe(true);
    expect(
      wave.every((source) =>
        source.acquisition === "github"
          ? source.adapter === "github-releases"
          : source.adapter === "rss",
      ),
    ).toBe(true);
    expect(wave.every((source) => source.licenseNote.length > 40)).toBe(true);
    expect(wave.every((source) => sourceCatalog.some((entry) => entry.slug === source.slug))).toBe(
      true,
    );
  });

  it("adds live-validated investment firm feeds behind the shadow gate", () => {
    const capitalSources = capitalEvidenceSources20260714;

    expect(capitalSources).toHaveLength(5);
    expect(new Set(capitalSources.map((source) => source.slug)).size).toBe(5);
    expect(new Set(capitalSources.map((source) => source.endpoint)).size).toBe(5);
    expect(capitalSources.filter((source) => source.region === "CN")).toHaveLength(1);
    expect(capitalSources.every((source) => source.category === "capital-business")).toBe(true);
    expect(capitalSources.every((source) => source.adapter === "rss")).toBe(true);
    expect(capitalSources.every((source) => source.acquisition === "rss")).toBe(true);
    expect(capitalSources.every((source) => source.tier === 2)).toBe(true);
    expect(capitalSources.every((source) => source.role === "expert")).toBe(true);
    expect(capitalSources.every((source) => source.enabled === false)).toBe(true);
    expect(capitalSources.every((source) => source.lifecycleStatus === "shadow")).toBe(true);
    expect(capitalSources.every((source) => source.maintenanceStatus === "candidate")).toBe(true);
    expect(capitalSources.every((source) => source.endpoint.startsWith("https://"))).toBe(true);
    expect(
      capitalSources.every((source) => sourceCatalog.some((entry) => entry.slug === source.slug)),
    ).toBe(true);
  });

  it("keeps the priority vendor evidence network broad and shadow-first", () => {
    const vendorSources = [...vendorEvidenceSources20260714, ...ecosystemEvidenceSources20260714];

    expect(vendorEvidenceSources20260714).toHaveLength(12);
    expect(ecosystemEvidenceSources20260714).toHaveLength(15);
    expect(vendorSources).toHaveLength(27);
    expect(new Set(vendorSources.map((source) => source.slug)).size).toBe(27);
    expect(new Set(vendorSources.map((source) => source.endpoint)).size).toBe(27);
    expect(vendorSources.filter((source) => source.acquisition === "rss")).toHaveLength(17);
    expect(vendorSources.filter((source) => source.acquisition === "html")).toHaveLength(10);
    expect(vendorSources.every((source) => source.tier === 1)).toBe(true);
    expect(vendorSources.every((source) => source.role === "primary")).toBe(true);
    expect(vendorSources.every((source) => source.enabled === false)).toBe(true);
    expect(vendorSources.every((source) => source.lifecycleStatus === "shadow")).toBe(true);
    expect(vendorSources.every((source) => source.maintenanceStatus === "candidate")).toBe(true);
    expect(
      vendorSources.every((source) =>
        source.acquisition === "rss" ? source.adapter === "rss" : source.adapter === "web-scraper",
      ),
    ).toBe(true);
    expect(
      vendorSources.every((source) => sourceCatalog.some((entry) => entry.slug === source.slug)),
    ).toBe(true);
  });

  it("keeps roadmap and releases tied to capability evidence", () => {
    expect(roadmap).toHaveLength(5);
    expect(roadmap.every((state) => state.milestones.length >= 3)).toBe(true);
    expect(capabilities.length).toBeGreaterThanOrEqual(25);
    expect(capabilities.every((capability) => capability.evidence.length > 10)).toBe(true);
    expect(releases[0]).toMatchObject({ version: "unreleased", status: "unreleased" });
    expect(releases[1]?.capabilities.length).toBeGreaterThanOrEqual(5);
    expect(releases[1]).toMatchObject({ version: "0.11.0", status: "released" });
    expect(releases[2]).toMatchObject({ version: "0.10.0", status: "released" });
    expect(releases[3]).toMatchObject({ version: "0.9.0", status: "released" });
    expect(releases[4]).toMatchObject({ version: "0.8.1" });
    expect(releases[5]).toMatchObject({ version: "0.8.0" });
  });

  it("keeps a unique, public and policy-aware AI influencer matrix", () => {
    expect(influencerCatalog.length).toBeGreaterThanOrEqual(10);
    expect(new Set(influencerCatalog.map((item) => item.slug)).size).toBe(influencerCatalog.length);
    expect(influencerCatalog.filter((item) => item.region === "CN").length).toBeGreaterThanOrEqual(
      4,
    );
    expect(influencerCatalog.filter((item) => item.feedSourceSlug).length).toBeGreaterThanOrEqual(
      7,
    );
    for (const influencer of influencerCatalog) {
      expect(influencer.focus.length).toBeGreaterThanOrEqual(2);
      for (const profile of influencer.profiles) expect(() => new URL(profile.url)).not.toThrow();
    }
    expect(sourceCatalog.find((source) => source.slug === "jike-ai-experts")).toMatchObject({
      maintenanceStatus: "restricted",
      enabled: false,
    });
  });
});
