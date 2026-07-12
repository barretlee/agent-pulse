/**
 * Signal quality scoring — evaluates each collected signal across multiple
 * dimensions to produce a composite quality score (0-100).
 *
 * Dimensions:
 *   - Source authority: based on source tier, role, and health
 *   - Content richness: title + summary length, structured data presence
 *   - Freshness: how recent the signal is
 *   - Originality: whether it's a primary source or aggregator
 *   - Completeness: has URL, date, author, category, tags
 */

import type { CollectedSignal, SourceDescriptor } from "../domain/types.js";

export interface QualityDimensions {
  authority: number; // 0-25: source credibility
  richness: number; // 0-25: content depth
  freshness: number; // 0-20: recency
  originality: number; // 0-15: primary vs aggregator
  completeness: number; // 0-15: metadata completeness
}

export interface QualityScore {
  total: number; // 0-100
  dimensions: QualityDimensions;
  grade: QualityGrade;
  flags: QualityFlag[];
}

export type QualityGrade = "A" | "B" | "C" | "D" | "F";
export type QualityFlag =
  | "low-authority"
  | "thin-content"
  | "stale"
  | "aggregator-only"
  | "missing-date"
  | "missing-category"
  | "short-title"
  | "no-tags";

/**
 * Score a single collected signal against its source descriptor.
 */
export function scoreSignal(
  signal: CollectedSignal,
  source: Pick<SourceDescriptor, "tier" | "role" | "authorityScore" | "region">,
): QualityScore {
  const dimensions: QualityDimensions = {
    authority: scoreAuthority(source),
    richness: scoreRichness(signal),
    freshness: scoreFreshness(signal.publishedAt),
    originality: scoreOriginality(source, signal),
    completeness: scoreCompleteness(signal),
  };

  const total = Math.round(
    dimensions.authority +
      dimensions.richness +
      dimensions.freshness +
      dimensions.originality +
      dimensions.completeness,
  );

  const flags = detectFlags(signal, source, dimensions);
  const grade = toGrade(total);

  return { total, dimensions, grade, flags };
}

/**
 * Batch score signals and return a summary.
 */
export function scoreBatch(
  signals: CollectedSignal[],
  source: Pick<SourceDescriptor, "tier" | "role" | "authorityScore" | "region">,
): { scores: QualityScore[]; summary: QualitySummary } {
  const scores = signals.map((s) => scoreSignal(s, source));

  if (scores.length === 0) {
    return {
      scores: [],
      summary: {
        total: 0,
        avgScore: 0,
        gradeDistribution: { A: 0, B: 0, C: 0, D: 0, F: 0 },
        topFlags: [],
      },
    };
  }

  const avgScore = Math.round(scores.reduce((sum, s) => sum + s.total, 0) / scores.length);
  const gradeDistribution: Record<QualityGrade, number> = { A: 0, B: 0, C: 0, D: 0, F: 0 };
  const flagCounts = new Map<QualityFlag, number>();

  for (const score of scores) {
    gradeDistribution[score.grade]++;
    for (const flag of score.flags) {
      flagCounts.set(flag, (flagCounts.get(flag) ?? 0) + 1);
    }
  }

  const topFlags = [...flagCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([flag, count]) => ({ flag, count }));

  return {
    scores,
    summary: {
      total: scores.length,
      avgScore,
      gradeDistribution,
      topFlags,
    },
  };
}

export interface QualitySummary {
  total: number;
  avgScore: number;
  gradeDistribution: Record<QualityGrade, number>;
  topFlags: Array<{ flag: QualityFlag; count: number }>;
}

// ─── Dimension Scorers ────────────────────────────────────────────────────

function scoreAuthority(
  source: Pick<SourceDescriptor, "tier" | "role" | "authorityScore">,
): number {
  const base = source.authorityScore ?? 50;
  // Normalize to 0-25
  const normalized = Math.min(25, Math.round(base / 4));
  // Bonus for primary sources
  const roleBonus =
    source.role === "primary"
      ? 3
      : source.role === "research"
        ? 2
        : source.role === "expert"
          ? 1
          : 0;
  return Math.min(25, normalized + roleBonus);
}

function scoreRichness(signal: CollectedSignal): number {
  let score = 0;
  const summaryLen = signal.summary?.length ?? 0;
  const titleLen = signal.title?.length ?? 0;

  // Summary length: >200 chars = full points
  if (summaryLen > 800) score += 10;
  else if (summaryLen > 400) score += 7;
  else if (summaryLen > 100) score += 4;
  else score += 1;

  // Title quality: meaningful titles are 20-150 chars
  if (titleLen > 20 && titleLen < 150) score += 8;
  else if (titleLen > 10) score += 4;
  else score += 1;

  // Tags / keywords
  if (signal.tags.length >= 3) score += 4;
  else if (signal.tags.length >= 1) score += 2;

  // Metrics presence (has engagement data)
  const hasMetrics = Object.values(signal.metrics ?? {}).some(
    (v) => typeof v === "number" || (Array.isArray(v) && v.length > 0),
  );
  if (hasMetrics) score += 3;

  return Math.min(25, score);
}

function scoreFreshness(publishedAt: string): number {
  const age = Date.now() - new Date(publishedAt).getTime();
  if (!Number.isFinite(age)) return 10;

  const hours = age / 3_600_000;
  if (hours <= 1) return 20; // Last hour
  if (hours <= 6) return 18; // Today
  if (hours <= 24) return 15; // Yesterday
  if (hours <= 72) return 10; // This week
  if (hours <= 168) return 6; // This month
  if (hours <= 720) return 3; // This month+
  return 1; // Older
}

function scoreOriginality(source: Pick<SourceDescriptor, "role">, signal: CollectedSignal): number {
  // Primary and research sources get full marks
  if (source.role === "primary" || source.role === "research") return 15;
  if (source.role === "expert") return 12;

  // Media sources with origin URL are more original
  if (signal.origin?.url) return 10;
  if (signal.origin?.kind === "social" && signal.origin.handle) return 8;

  // Aggregators are least original
  if (source.role === "aggregator" || source.role === "heat") return 4;

  return 7; // Default media/expert
}

function scoreCompleteness(signal: CollectedSignal): number {
  let score = 0;

  if (signal.url?.length > 10) score += 3;
  if (signal.title?.length > 5) score += 3;
  if (signal.summary?.length > 50) score += 3;
  if (signal.publishedAt && !Number.isNaN(new Date(signal.publishedAt).getTime())) score += 3;
  if (signal.category && signal.category !== "industry") score += 1;
  if (signal.tags.length > 0) score += 1;
  if (signal.author) score += 1;

  return Math.min(15, score);
}

// ─── Flag Detection ──────────────────────────────────────────────────────

function detectFlags(
  signal: CollectedSignal,
  source: Pick<SourceDescriptor, "tier" | "role" | "authorityScore">,
  dimensions: QualityDimensions,
): QualityFlag[] {
  const flags: QualityFlag[] = [];

  if (dimensions.authority < 8) flags.push("low-authority");
  if (dimensions.richness < 8) flags.push("thin-content");
  if (dimensions.freshness < 5) flags.push("stale");
  if (source.role === "aggregator" || dimensions.originality < 5) flags.push("aggregator-only");
  if (!signal.publishedAt || Number.isNaN(new Date(signal.publishedAt).getTime()))
    flags.push("missing-date");
  if (!signal.category || signal.category === "industry") flags.push("missing-category");
  if ((signal.title?.length ?? 0) < 10) flags.push("short-title");
  if (signal.tags.length === 0) flags.push("no-tags");

  return flags;
}

function toGrade(total: number): QualityGrade {
  if (total >= 80) return "A";
  if (total >= 65) return "B";
  if (total >= 50) return "C";
  if (total >= 35) return "D";
  return "F";
}

/**
 * Filter signals to only those meeting a minimum quality threshold.
 */
export function filterByQuality(
  signals: CollectedSignal[],
  source: Pick<SourceDescriptor, "tier" | "role" | "authorityScore" | "region">,
  minGrade: QualityGrade = "D",
): CollectedSignal[] {
  const gradeValues: Record<QualityGrade, number> = { A: 4, B: 3, C: 2, D: 1, F: 0 };
  const threshold = gradeValues[minGrade];

  return signals.filter((signal) => {
    const score = scoreSignal(signal, source);
    return gradeValues[score.grade] >= threshold;
  });
}
