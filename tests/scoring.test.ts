import { describe, expect, it } from "vitest";
import { heatLabel, scoreEvent } from "../src/domain/scoring.js";

describe("scoreEvent", () => {
  it("separates authority from cross-platform heat", () => {
    const result = scoreEvent({
      authorityScores: [98, 72],
      primaryEvidenceCount: 1,
      independentSourceCount: 4,
      metrics: [
        { authors: 80, tweets: 250, platforms: ["x"], regions: ["US"] },
        { authors: 30, platforms: ["weibo", "wechat"], regions: ["CN"] },
      ],
      ageHours: 5,
      impactHint: 90,
    });
    expect(result.confidence).toBeGreaterThan(85);
    expect(result.heat).toBeGreaterThan(70);
    expect(result.factors.crossRegion).toBe(true);
    expect(heatLabel(result.heat, result.confidence, result.factors.crossRegion)).toBe("跨圈热点");
  });

  it("does not call a single-platform weak signal cross-region hot", () => {
    const result = scoreEvent({
      authorityScores: [45],
      primaryEvidenceCount: 0,
      independentSourceCount: 1,
      metrics: [{ authors: 3, tweets: 4, platforms: ["x"], regions: ["US"] }],
      ageHours: 1,
    });
    expect(result.confidence).toBeLessThan(60);
    expect(result.factors.crossRegion).toBe(false);
  });
});
