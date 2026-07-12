import { describe, expect, it } from "vitest";
import {
  renderSourceHealthIssue,
  SOURCE_HEALTH_SUMMARY_MARKER,
} from "../src/cli/render-source-health-issue.js";

describe("automated source health summary", () => {
  it("renders one bounded, privacy-safe issue body", () => {
    const results = Array.from({ length: 25 }, (_, index) => ({
      slug: `source-${index}`,
      status: index % 2 ? "failed" : "degraded",
      errorCode: "NETWORK|`unsafe`<tag>",
      repairAction: "verify_network_dns_or_proxy",
    }));
    const body = renderSourceHealthIssue({
      startedAt: "2026-07-12T00:00:00.000Z",
      finishedAt: "2026-07-12T00:10:00.000Z",
      total: 30,
      healthy: 5,
      degraded: 12,
      failed: 13,
      skipped: 0,
      accessible: 20,
      withContent: 5,
      results,
    });
    expect(body).toContain(SOURCE_HEALTH_SUMMARY_MARKER);
    expect(body).toContain("Showing 20 of 25 exceptions");
    expect(body.match(/^\| `source-/gm)).toHaveLength(20);
    expect(body).not.toContain("<tag>");
    expect(body.length).toBeLessThan(6_000);
  });
});
