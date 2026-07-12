import { afterEach, describe, expect, it, vi } from "vitest";
import { githubDataFromEnvironment } from "../src/pipeline/static-site/github.js";

describe("build-time GitHub metadata", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("keeps fresh numeric metadata", () => {
    vi.stubEnv("GITHUB_STARS", "42");
    vi.stubEnv("GITHUB_FORKS", "7");
    vi.stubEnv("GITHUB_OPEN_ISSUES", "3");
    vi.stubEnv("GITHUB_METADATA_FETCHED_AT", "2026-07-12T10:00:00.000Z");
    expect(githubDataFromEnvironment("0.6.0", new Date("2026-07-12T12:00:00.000Z"))).toMatchObject({
      stars: 42,
      forks: 7,
      openIssues: 3,
      latestRelease: "v0.6.0",
    });
  });

  it("does not display stale numbers", () => {
    vi.stubEnv("GITHUB_STARS", "999");
    vi.stubEnv("GITHUB_METADATA_FETCHED_AT", "2026-07-10T10:00:00.000Z");
    expect(githubDataFromEnvironment("0.6.0", new Date("2026-07-12T12:00:00.000Z"))).toMatchObject({
      stars: null,
      fetchedAt: null,
    });
  });
});
