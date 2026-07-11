import { describe, expect, it } from "vitest";
import { belongsToEvent, titleSimilarity } from "../src/domain/clustering.js";

describe("event clustering", () => {
  it("groups updates about the same release", () => {
    const left = "OpenAI launches GPT-5.6 for long-running agent work";
    const right = "UPDATE: OpenAI GPT-5.6 launches with agent work mode";
    expect(titleSimilarity(left, right)).toBeGreaterThan(0.5);
    expect(
      belongsToEvent(
        { title: left, publishedAt: "2026-07-11T00:00:00Z" },
        { title: right, happenedAt: "2026-07-10T12:00:00Z" },
      ),
    ).toBe(true);
  });

  it("does not group unrelated events outside the time window", () => {
    expect(
      belongsToEvent(
        { title: "OpenAI launches GPT-5.6", publishedAt: "2026-07-11T00:00:00Z" },
        { title: "OpenAI launches GPT-5.6", happenedAt: "2026-01-01T00:00:00Z" },
      ),
    ).toBe(false);
  });
});
