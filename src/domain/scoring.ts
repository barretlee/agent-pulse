import type { ScoreResult, SignalMetrics } from "./types.js";

export interface ScoringInput {
  authorityScores: number[];
  primaryEvidenceCount: number;
  independentSourceCount: number;
  metrics: SignalMetrics[];
  ageHours: number;
  impactHint?: number;
}

const clamp = (value: number) => Math.max(0, Math.min(100, Math.round(value)));
const logScale = (value: number, denominator: number) =>
  value <= 0 ? 0 : Math.min(1, Math.log1p(value) / Math.log1p(denominator));

export function scoreEvent(input: ScoringInput): ScoreResult {
  const authority = input.authorityScores.length ? Math.max(...input.authorityScores) : 20;
  const uniqueAuthors = Math.max(0, ...input.metrics.map((item) => item.authors ?? 0));
  const tweets = Math.max(0, ...input.metrics.map((item) => item.tweets ?? 0));
  const platforms = new Set(input.metrics.flatMap((item) => item.platforms ?? [])).size;
  const regions = new Set(input.metrics.flatMap((item) => item.regions ?? [])).size;
  const crossRegion = regions >= 2;
  const freshness = clamp(100 * Math.exp(-Math.max(0, input.ageHours) / 96));

  const confidence = clamp(
    authority * 0.62 +
      Math.min(input.independentSourceCount, 4) * 7 +
      Math.min(input.primaryEvidenceCount, 2) * 10,
  );
  const heat = clamp(
    logScale(uniqueAuthors, 80) * 30 +
      logScale(tweets, 300) * 20 +
      Math.min(input.independentSourceCount, 5) * 8 +
      Math.min(platforms, 4) * 7 +
      Math.min(regions, 3) * 6 +
      freshness * 0.08,
  );
  const impact = clamp(input.impactHint ?? 55);
  const value = clamp(confidence * 0.3 + impact * 0.3 + heat * 0.25 + freshness * 0.15);

  return {
    confidence,
    heat,
    impact,
    value,
    factors: {
      authority,
      corroboration: Math.min(input.independentSourceCount * 20, 100),
      primaryEvidence: Math.min(input.primaryEvidenceCount * 50, 100),
      uniqueAuthors,
      independentSources: input.independentSourceCount,
      platformBreadth: platforms,
      regionBreadth: regions,
      velocity: clamp(logScale(tweets, 300) * 100),
      freshness,
      crossRegion,
    },
  };
}

export function heatLabel(heat: number, confidence: number, crossRegion: boolean): string {
  if (heat >= 70 && confidence >= 60 && crossRegion) return "跨圈热点";
  if (heat >= 60 && confidence >= 55) return "高关注";
  if (heat >= 40) return "升温中";
  return "观察信号";
}
