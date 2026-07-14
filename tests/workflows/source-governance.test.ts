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
      audit.indexOf("npm run db:snapshot -- merge"),
    );
    expect(audit.indexOf("git fetch origin main")).toBeLessThan(
      audit.indexOf("npm run db:snapshot -- merge"),
    );
    expect(audit.indexOf("npm run db:snapshot -- merge")).toBeLessThan(
      audit.indexOf("npm run db:snapshot -- write"),
    );
    expect(refresh.indexOf("git fetch origin main")).toBeLessThan(
      refresh.indexOf("npm run db:snapshot -- merge"),
    );
    expect(refresh.indexOf("npm run db:snapshot -- merge")).toBeLessThan(
      refresh.indexOf("npm run db:snapshot -- write"),
    );
    expect(audit).not.toContain("git push --force");
    expect(refresh).not.toContain("git push --force");
    expect(audit).toContain("npm run observe:sources -- --confirm");
    expect(audit).toContain("gh workflow run pages.yml --ref main");
    expect(audit).toContain("public:validate");
    expect(refresh).toContain("public:validate");
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

  it("refreshes daily and deploys Pages after each successful refresh", async () => {
    const refresh = await workflow("data-refresh.yml");
    expect(refresh).toContain('cron: "17 12 * * *"');
    for (const command of [
      "npm run collect",
      "npm run ops:reconcile",
      "npm run observe:sources -- --confirm",
      "npm run activate:auto",
      "npm run --silent research:impact -- --skip-seed",
      "npm run --silent ai:enrich -- --require-success",
      "npm run scout:generate -- 12",
      "npm run auto:publish",
      "npm run --silent evaluate:system",
      "npm run --silent public:fingerprint",
      "npm run db:snapshot -- write",
      "gh workflow run pages.yml --ref main",
    ]) {
      expect(refresh).toContain(command);
    }
    expect(refresh).not.toContain("daily:issue");
    expect(refresh).not.toContain("agent-pulse-daily-brief");
    expect(refresh).toContain("Dispatch Pages deployment after the daily refresh");
    expect(refresh).toContain(["DEEPSEEK_API_KEY: $", "{{ secrets.DEEPSEEK_API_KEY }}"].join(""));
    expect(refresh.indexOf("npm run collect")).toBeLessThan(
      refresh.indexOf("npm run --silent research:impact -- --skip-seed"),
    );
    expect(refresh.indexOf("npm run --silent research:impact -- --skip-seed")).toBeLessThan(
      refresh.indexOf("npm run --silent ai:enrich -- --require-success"),
    );
    expect(refresh.indexOf("npm run --silent ai:enrich -- --require-success")).toBeLessThan(
      refresh.indexOf("npm run auto:publish"),
    );
    expect(refresh).toContain(
      'JSON.parse(require("node:fs").readFileSync(process.argv[1], "utf8"))',
    );
    expect(refresh).toContain(['status="', "$", '{PIPESTATUS[0]}"'].join(""));
    expect(refresh).toContain("AI Event enrichment unavailable");
    expect(refresh.indexOf("npm run db:snapshot -- write")).toBeLessThan(
      refresh.indexOf("git push origin HEAD:main"),
    );
    expect(refresh.indexOf("git push origin HEAD:main")).toBeLessThan(
      refresh.indexOf("gh workflow run pages.yml --ref main"),
    );
    expect(refresh.indexOf("gh workflow run pages.yml --ref main")).toBeLessThan(
      refresh.indexOf("npm run --silent weekly:issue"),
    );
    expect(refresh).toContain("--ai");
    expect(refresh).toContain("--require-success");
    expect(refresh).toContain("weekly-status.json");
    expect(refresh).toContain("AI weekly brief skipped");
    expect(refresh).toContain("DEEPSEEK_STAGE_MODEL: deepseek-v4-pro");
    expect(refresh).toContain('gh label create "stage:milestone"');
    expect(refresh).toContain('gh issue create --title "$title"');
    expect(refresh).toContain("npm run --silent narrative:stage -- apply");
    expect(refresh).toContain("data/narratives/stage-promotions.json");
    const artifactSection = refresh.slice(refresh.indexOf("name: Upload refresh observability"));
    expect(artifactSection).not.toContain("stage-promotion-candidate.json");
    expect(
      refresh.indexOf("git show origin/main:data/narratives/stage-promotions.json"),
    ).toBeLessThan(refresh.indexOf("npm run --silent narrative:stage -- propose"));
    expect(refresh.indexOf("npm run --silent narrative:stage -- propose")).toBeLessThan(
      refresh.indexOf("npm run --silent narrative:stage -- apply"),
    );
    expect(refresh.indexOf('gh issue create --title "$title"')).toBeLessThan(
      refresh.indexOf("npm run --silent narrative:stage -- apply"),
    );
    expect(refresh.indexOf("npm run --silent narrative:stage -- apply")).toBeLessThan(
      refresh.lastIndexOf("npm run --silent public:fingerprint"),
    );
    expect(refresh).toContain("if: always()");
    expect(refresh).toContain("if-no-files-found: ignore");
    expect(refresh).toContain("data/reports/research-impact.json");
    expect(refresh).not.toContain(
      "steps.commit.outputs.changed == 'true' && steps.public.outputs.changed == 'true'",
    );
    const audit = await workflow("source-audit.yml");
    expect(audit).toContain('cron: "37 22 * * 6"');
    expect(audit).toContain("public:fingerprint -- --include-sources");
    expect(audit).toContain(
      "steps.commit.outputs.changed == 'true' && steps.public.outputs.changed == 'true'",
    );
  });

  it("keeps CI deterministic while exposing the exact failing phase", async () => {
    const ci = await workflow("ci.yml");
    for (const step of [
      "name: Lint",
      "run: npm run lint",
      "name: Typecheck",
      "run: npm run typecheck",
      "name: Test",
      "run: npm test",
      "name: Export static site",
      "run: npm run export",
      "name: Build",
      "run: npm run build",
      "name: Validate public content across every main tab",
      "run: npm run --silent public:validate",
    ]) {
      expect(ci).toContain(step);
    }
    expect(ci).not.toContain("run: npm run check");
    const pages = await workflow("pages.yml");
    expect(pages).toContain("public:validate");
    expect(pages.indexOf("public:validate")).toBeLessThan(
      pages.indexOf("actions/upload-pages-artifact"),
    );
  });

  it("runs weekly guards and dispatches one cooled-down refresh when quality is below 60", async () => {
    const [guard, monitor] = await Promise.all([
      workflow("quality-guard.yml"),
      workflow("monitor.yml"),
    ]);
    expect(guard).toContain('cron: "47 0 * * 1"');
    expect(monitor).toContain('cron: "17 0 * * 1"');
    expect(monitor).toContain("9 * 24 * 60 * 60 * 1000");
    expect(monitor).toContain("allow_notification:");
    expect(monitor).toContain("monitor:decide");
    expect(monitor).toContain("monitor-decision.json");
    expect(monitor).toContain("steps.decision.outputs.notify == 'true'");
    expect(monitor).toContain("agent-pulse-monitor:v2 fingerprint=");
    expect(guard).toContain("QUALITY_FLOOR: 60");
    expect(guard).toContain("REFRESH_COOLDOWN_HOURS: 120");
    expect(guard).toContain("gh run list --workflow data-refresh.yml");
    expect(guard).toContain("gh workflow run data-refresh.yml --ref main --field mode=incremental");
  });

  it("creates a missing GitHub Release only after CI verifies main", async () => {
    const release = await workflow("release.yml");
    expect(release).toContain('workflows: ["CI"]');
    expect(release).toContain("github.event.workflow_run.conclusion == 'success'");
    expect(release).toContain("npm run release:check");
    expect(release).toContain("gh release view");
    expect(release).toContain("gh release create");
  });
});
