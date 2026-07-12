import type { Kysely } from "kysely";
import { parseJson } from "../db/repository.js";
import type { DatabaseSchema, EventRow } from "../db/types.js";
import type { ScoreFactors } from "../domain/types.js";

export type ReadinessBlocker =
  | "event_not_found"
  | "placeholder_content"
  | "thin_fact"
  | "generic_entity"
  | "missing_category"
  | "missing_keywords"
  | "missing_track"
  | "missing_evidence"
  | "missing_primary_evidence"
  | "low_confidence"
  | "unsupported_heat";

export interface EventReadiness {
  eventId: string;
  status: "ready" | "blocked";
  blockers: ReadinessBlocker[];
  warnings: string[];
  evidenceCount: number;
  independentSources: number;
  primaryEvidence: number;
  trackCount: number;
  evidenceLevel: "none" | "single-primary" | "multi-source";
}

export async function evaluateEventReadiness(
  db: Kysely<DatabaseSchema>,
  eventId: string,
  candidatePatch: Partial<EventRow> = {},
): Promise<EventReadiness> {
  const event = await db
    .selectFrom("events")
    .selectAll()
    .where("id", "=", eventId)
    .executeTakeFirst();
  if (!event) {
    return result(eventId, ["event_not_found"], 0, 0, 0, 0);
  }
  const candidate = { ...event, ...candidatePatch };
  const [evidence, tracks] = await Promise.all([
    db
      .selectFrom("event_signals")
      .innerJoin("signals", "signals.id", "event_signals.signal_id")
      .innerJoin("sources", "sources.id", "signals.source_id")
      .select([
        "sources.id as sourceId",
        "sources.tier as tier",
        "sources.role as role",
        "sources.source_category as sourceCategory",
      ])
      .where("event_signals.event_id", "=", eventId)
      .execute(),
    db
      .selectFrom("event_tracks")
      .select(({ fn }) => fn.countAll<number>().as("count"))
      .where("event_id", "=", eventId)
      .executeTakeFirstOrThrow(),
  ]);
  const independentSources = new Set(evidence.map((item) => item.sourceId)).size;
  const primaryEvidence = new Set(
    evidence
      .filter(
        (item) =>
          item.tier === 1 && item.role !== "aggregator" && item.sourceCategory !== "aggregator",
      )
      .map((item) => item.sourceId),
  ).size;
  const trackCount = Number(tracks.count);
  const blockers: ReadinessBlocker[] = [];
  const content = [
    candidate.fact_summary,
    candidate.summary,
    candidate.technical_insight,
    candidate.industry_insight,
    candidate.future_outlook,
    candidate.business_value,
  ];
  if (content.some(hasPlaceholder)) blockers.push("placeholder_content");
  if (candidate.fact_summary.trim().length < 20 || candidate.summary.trim().length < 20)
    blockers.push("thin_fact");
  if (
    ["industry", "unknown", "other", "其他", "未知"].includes(
      candidate.company.trim().toLowerCase(),
    )
  )
    blockers.push("generic_entity");
  if (!candidate.category.trim() || candidate.category === "industry")
    blockers.push("missing_category");
  if (parseJson<string[]>(candidate.keywords_json, []).length === 0)
    blockers.push("missing_keywords");
  if (trackCount === 0) blockers.push("missing_track");
  if (evidence.length === 0) blockers.push("missing_evidence");
  if (primaryEvidence === 0) blockers.push("missing_primary_evidence");
  if (candidate.confidence_score < 60) blockers.push("low_confidence");
  const factors = parseJson<Partial<ScoreFactors>>(candidate.score_factors_json, {});
  if (
    candidate.heat_score >= 70 &&
    ((factors.independentSources ?? 0) < 2 || (factors.platformBreadth ?? 0) < 2)
  ) {
    blockers.push("unsupported_heat");
  }
  const warnings =
    independentSources < 2 ? ["single-source fact; cross-source corroboration pending"] : [];
  return {
    ...result(eventId, blockers, evidence.length, independentSources, primaryEvidence, trackCount),
    warnings,
  };
}

export async function eventReadinessSummary(db: Kysely<DatabaseSchema>) {
  const [events, evidence, tracks] = await Promise.all([
    db.selectFrom("events").selectAll().execute(),
    db
      .selectFrom("event_signals")
      .innerJoin("signals", "signals.id", "event_signals.signal_id")
      .innerJoin("sources", "sources.id", "signals.source_id")
      .select([
        "event_signals.event_id as eventId",
        "sources.id as sourceId",
        "sources.tier as tier",
        "sources.role as role",
        "sources.source_category as sourceCategory",
      ])
      .execute(),
    db
      .selectFrom("event_tracks")
      .select(["event_id as eventId", ({ fn }) => fn.countAll<number>().as("count")])
      .groupBy("event_id")
      .execute(),
  ]);
  const evidenceByEvent = new Map<string, typeof evidence>();
  for (const row of evidence) {
    const rows = evidenceByEvent.get(row.eventId) ?? [];
    rows.push(row);
    evidenceByEvent.set(row.eventId, rows);
  }
  const tracksByEvent = new Map(tracks.map((row) => [row.eventId, Number(row.count)]));
  const readiness = events.map((event) =>
    evaluateReadinessRow(
      event,
      evidenceByEvent.get(event.id) ?? [],
      tracksByEvent.get(event.id) ?? 0,
    ),
  );
  const blockerCounts: Record<string, number> = {};
  for (const item of readiness) {
    for (const blocker of item.blockers) {
      blockerCounts[blocker] = (blockerCounts[blocker] ?? 0) + 1;
    }
  }
  return {
    total: readiness.length,
    ready: readiness.filter((item) => item.status === "ready").length,
    blocked: readiness.filter((item) => item.status === "blocked").length,
    blockerCounts,
    items: readiness,
  };
}

function evaluateReadinessRow(
  candidate: EventRow,
  evidence: Array<{
    sourceId: string;
    tier: number;
    role: string;
    sourceCategory: string;
  }>,
  trackCount: number,
): EventReadiness {
  const independentSources = new Set(evidence.map((item) => item.sourceId)).size;
  const primaryEvidence = new Set(
    evidence
      .filter(
        (item) =>
          item.tier === 1 && item.role !== "aggregator" && item.sourceCategory !== "aggregator",
      )
      .map((item) => item.sourceId),
  ).size;
  const blockers: ReadinessBlocker[] = [];
  const content = [
    candidate.fact_summary,
    candidate.summary,
    candidate.technical_insight,
    candidate.industry_insight,
    candidate.future_outlook,
    candidate.business_value,
  ];
  if (content.some(hasPlaceholder)) blockers.push("placeholder_content");
  if (candidate.fact_summary.trim().length < 20 || candidate.summary.trim().length < 20)
    blockers.push("thin_fact");
  if (
    ["industry", "unknown", "other", "其他", "未知"].includes(
      candidate.company.trim().toLowerCase(),
    )
  )
    blockers.push("generic_entity");
  if (!candidate.category.trim() || candidate.category === "industry")
    blockers.push("missing_category");
  if (parseJson<string[]>(candidate.keywords_json, []).length === 0)
    blockers.push("missing_keywords");
  if (trackCount === 0) blockers.push("missing_track");
  if (evidence.length === 0) blockers.push("missing_evidence");
  if (primaryEvidence === 0) blockers.push("missing_primary_evidence");
  if (candidate.confidence_score < 60) blockers.push("low_confidence");
  const factors = parseJson<Partial<ScoreFactors>>(candidate.score_factors_json, {});
  if (
    candidate.heat_score >= 70 &&
    ((factors.independentSources ?? 0) < 2 || (factors.platformBreadth ?? 0) < 2)
  ) {
    blockers.push("unsupported_heat");
  }
  return {
    ...result(
      candidate.id,
      blockers,
      evidence.length,
      independentSources,
      primaryEvidence,
      trackCount,
    ),
    warnings:
      independentSources < 2 ? ["single-source fact; cross-source corroboration pending"] : [],
  };
}

function hasPlaceholder(value: string): boolean {
  return /待编辑|待补充|\bTBD\b|\bTODO\b|placeholder/i.test(value);
}

function result(
  eventId: string,
  blockers: ReadinessBlocker[],
  evidenceCount: number,
  independentSources: number,
  primaryEvidence: number,
  trackCount: number,
): EventReadiness {
  return {
    eventId,
    status: blockers.length ? "blocked" : "ready",
    blockers: [...new Set(blockers)],
    warnings: [],
    evidenceCount,
    independentSources,
    primaryEvidence,
    trackCount,
    evidenceLevel:
      primaryEvidence === 0 ? "none" : independentSources >= 2 ? "multi-source" : "single-primary",
  };
}
