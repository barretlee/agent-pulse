import { describe, expect, it } from "vitest";
import {
  calculateOverallScore,
  calibrateDimension,
  type EvaluationDimension,
} from "../src/pipeline/evaluate.js";

function dimension(overrides: Partial<EvaluationDimension> = {}): EvaluationDimension {
  return {
    slug: "test",
    name: "Test",
    score: 50,
    rawScore: 50,
    scoreCap: 100,
    weight: 10,
    status: "measured",
    sampleSize: 100,
    sampleTarget: 100,
    summary: "test",
    evidence: {},
    penalties: [],
    nextAction: "test",
    ...overrides,
  };
}

describe("evaluation calibration", () => {
  it("hard caps an insufficient-data dimension at 45 or below", () => {
    const result = calibrateDimension({
      slug: "confidence",
      name: "Confidence",
      rawScore: 98,
      weight: 10,
      sufficient: false,
      sampleSize: 3,
      sampleTarget: 30,
      summary: "too few samples",
      evidence: { samples: 3 },
      nextAction: "collect evidence",
      insufficientCap: 80,
    });

    expect(result).toMatchObject({
      rawScore: 98,
      score: 45,
      scoreCap: 45,
      status: "insufficient_data",
    });
  });

  it("keeps a stricter dimension-specific cap", () => {
    const result = calibrateDimension({
      slug: "effectiveness",
      name: "Effectiveness",
      rawScore: 100,
      weight: 10,
      sufficient: false,
      sampleSize: 0,
      sampleTarget: 30,
      summary: "no outcome samples",
      evidence: {},
      nextAction: "collect outcomes",
      insufficientCap: 20,
    });

    expect(result.score).toBe(20);
    expect(result.scoreCap).toBe(20);
  });

  it("includes insufficient dimensions and applies evidence coverage confidence", () => {
    const result = calculateOverallScore([
      dimension({ score: 100, rawScore: 100, weight: 50 }),
      dimension({
        slug: "uncalibrated",
        score: 45,
        rawScore: 100,
        scoreCap: 45,
        weight: 50,
        status: "insufficient_data",
      }),
    ]);

    expect(result).toEqual({
      rawWeightedScore: 73,
      evidenceCoverage: 50,
      overallScore: 60,
    });
  });

  it("cannot produce a high overall score when every dimension lacks evidence", () => {
    const result = calculateOverallScore([
      dimension({
        score: 45,
        rawScore: 100,
        scoreCap: 45,
        status: "insufficient_data",
      }),
      dimension({
        slug: "second",
        score: 20,
        rawScore: 100,
        scoreCap: 20,
        status: "insufficient_data",
      }),
    ]);

    expect(result.evidenceCoverage).toBe(0);
    expect(result.rawWeightedScore).toBe(33);
    expect(result.overallScore).toBe(21);
  });
});
