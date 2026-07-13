import { describe, expect, it } from "vitest";
import { assertReleaseContract, extractReleaseNotes } from "../src/release/changelog.js";

const changelog = `# Changelog

## [Unreleased]

- Work in progress.

## [0.7.0] - 2026-07-13

### Added

- Autonomous release publishing.

## [0.6.0] - 2026-07-12

- Previous release.
`;

describe("release contract", () => {
  it("extracts only the requested version section", () => {
    expect(extractReleaseNotes(changelog, "0.7.0")).toContain("Autonomous release publishing");
    expect(extractReleaseNotes(changelog, "0.7.0")).not.toContain("Previous release");
  });

  it("requires package, product, website and repository changelog versions to agree", () => {
    expect(() =>
      assertReleaseContract({
        packageVersion: "0.7.0",
        productVersion: "0.7.0",
        changelog,
        websiteVersions: ["0.7.0", "0.6.0"],
      }),
    ).not.toThrow();
    expect(() =>
      assertReleaseContract({
        packageVersion: "0.7.0",
        productVersion: "0.6.0",
        changelog,
        websiteVersions: ["0.6.0"],
      }),
    ).toThrow(/mismatch/);
  });
});
