import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

async function workflow(name: string): Promise<string> {
  return readFile(`.github/workflows/${name}`, "utf8");
}

describe("GitHub source governance workflows", () => {
  it("serializes repository data writers and persists audit checks through the snapshot", async () => {
    const [audit, refresh] = await Promise.all([
      workflow("source-audit.yml"),
      workflow("data-refresh.yml"),
    ]);
    expect(audit).toContain("group: agent-pulse-repository-data-main");
    expect(refresh).toContain("group: agent-pulse-repository-data-main");
    expect(audit.indexOf("npm run db:snapshot -- restore")).toBeLessThan(
      audit.indexOf("npm run sources:audit"),
    );
    expect(audit.indexOf("npm run sources:audit")).toBeLessThan(
      audit.indexOf("npm run db:snapshot -- write"),
    );
    expect(audit).toContain("npm run observe:sources -- --confirm");
    expect(audit).toContain("gh workflow run pages.yml --ref main");
    expect(audit).toContain("agent-pulse-source-health-summary:v1");
    expect(audit).toContain("gh issue edit");
    expect(audit).toContain("gh issue create");
  });

  it("never turns untrusted issue text into an active source", async () => {
    const [triage, importer] = await Promise.all([
      workflow("source-proposal-triage.yml"),
      workflow("source-proposal-import.yml"),
    ]);
    expect(triage).toContain("$GITHUB_EVENT_PATH");
    expect(triage).not.toContain(["$", "{{ github.event.issue.body }}"].join(""));
    expect(importer).toContain("source:import-ready");
    expect(importer).toContain("collaborators/$GITHUB_ACTOR/permission");
    expect(importer).toContain("src/catalog/source-proposals.json");
    expect(importer).toContain("disabled draft");
    expect(importer).not.toContain("npm run activate");
    expect(importer).not.toContain("pull_request_target");
  });

  it("injects repository metrics at build time instead of using a browser API call", async () => {
    const pages = await workflow("pages.yml");
    expect(pages).toContain("GITHUB_STARS=");
    expect(pages).toContain("GITHUB_FORKS=");
    expect(pages).toContain("GITHUB_OPEN_ISSUES=");
    expect(pages).toContain("GITHUB_METADATA_FETCHED_AT=");
    expect(pages.indexOf("gh api")).toBeLessThan(pages.indexOf("npm run export"));
  });
});
