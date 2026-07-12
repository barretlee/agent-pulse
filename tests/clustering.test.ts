import { describe, expect, it } from "vitest";
import {
  belongsToEvent,
  eventFacet,
  eventFingerprint,
  titleSimilarity,
} from "../src/domain/clustering.js";

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

  it("keeps capability evaluations separate from the named model release", () => {
    const launch = "OpenAI announces GPT-5.6 for end-to-end knowledge work";
    const evaluation = "First enterprise evaluations show where GPT 5.6 improves coding";
    expect(titleSimilarity(launch, evaluation)).toBeLessThan(0.46);
    expect(eventFingerprint(launch)).toBe("openai:gpt:5.6");
    expect(eventFingerprint(evaluation)).toBe("openai:gpt:5.6");
    expect(
      belongsToEvent(
        { title: evaluation, publishedAt: "2026-07-12T00:00:00Z" },
        { title: launch, happenedAt: "2026-07-10T12:00:00Z" },
      ),
    ).toBe(false);
  });

  it("keeps incidents separate from the release event", () => {
    expect(eventFacet("GPT-5.6 outage affects API requests")).toBe("incident");
    expect(
      belongsToEvent(
        {
          title: "GPT-5.6 outage affects API requests",
          publishedAt: "2026-07-12T00:00:00Z",
        },
        {
          title: "OpenAI announces GPT-5.6",
          happenedAt: "2026-07-10T12:00:00Z",
        },
      ),
    ).toBe(false);
  });

  it("keeps capability follow-ups separate from a model launch", () => {
    expect(
      belongsToEvent(
        {
          title: "GPT-5.6 Sol solves a 50-year-old math problem",
          publishedAt: "2026-07-11T12:00:00.000Z",
        },
        {
          title: "OpenAI launches GPT-5.6 Sol, Terra and Luna",
          happenedAt: "2026-07-09T12:00:00.000Z",
        },
      ),
    ).toBe(false);
  });

  it("groups distribution updates for the same model", () => {
    expect(
      belongsToEvent(
        {
          title: "GPT-5.6 is now available in GitHub Copilot",
          publishedAt: "2026-07-09T16:00:00.000Z",
        },
        {
          title: "GPT-5.6 进入 Microsoft 365 Copilot：Agent 获得企业级分发",
          happenedAt: "2026-07-09T10:00:00.000Z",
        },
      ),
    ).toBe(true);
  });
});
