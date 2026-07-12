import type { Kysely } from "kysely";
import { Repository } from "../db/repository.js";
import type { DatabaseSchema, EventRow } from "../db/types.js";
import { eventabilityScore } from "./cluster.js";

export interface ReviewNoiseCandidate {
  eventId: string;
  signalId: string;
  title: string;
  sourceSlug: string;
  eventabilityScore: number;
}

export async function findReviewNoiseCandidates(
  db: Kysely<DatabaseSchema>,
): Promise<ReviewNoiseCandidate[]> {
  const [events, links, signals, sources] = await Promise.all([
    db
      .selectFrom("events")
      .selectAll()
      .where("status", "=", "review")
      .where("manual_override", "=", 0)
      .execute(),
    db.selectFrom("event_signals").select(["event_id", "signal_id"]).execute(),
    db.selectFrom("signals").selectAll().execute(),
    db.selectFrom("sources").selectAll().execute(),
  ]);
  const linksByEvent = groupLinks(links);
  const signalsById = new Map(signals.map((signal) => [signal.id, signal]));
  const sourcesById = new Map(sources.map((source) => [source.id, source]));
  const candidates: ReviewNoiseCandidate[] = [];
  for (const event of events) {
    if (!containsPlaceholder(event)) continue;
    const eventLinks = linksByEvent.get(event.id) ?? [];
    if (eventLinks.length !== 1) continue;
    const signal = signalsById.get(eventLinks[0]?.signal_id ?? "");
    const source = signal ? sourcesById.get(signal.source_id) : undefined;
    if (!signal || !source) continue;
    const score = eventabilityScore(signal, source);
    if (score >= 70) continue;
    candidates.push({
      eventId: event.id,
      signalId: signal.id,
      title: event.title,
      sourceSlug: source.slug,
      eventabilityScore: score,
    });
  }
  return candidates.sort(
    (left, right) =>
      left.eventabilityScore - right.eventabilityScore || left.title.localeCompare(right.title),
  );
}

export async function reconcileReviewNoise(
  db: Kysely<DatabaseSchema>,
): Promise<{ suppressed: number; sourceCounts: Record<string, number> }> {
  const candidates = await findReviewNoiseCandidates(db);
  const sourceCounts: Record<string, number> = {};
  await db.transaction().execute(async (trx) => {
    const repository = new Repository(trx);
    for (const candidate of candidates) {
      const event = await trx
        .selectFrom("events")
        .selectAll()
        .where("id", "=", candidate.eventId)
        .executeTakeFirst();
      if (!event) continue;
      await repository.deferSignal(
        candidate.signalId,
        "low_eventability_review_suppressed",
        candidate.eventabilityScore,
        { suppressedEvent: event, reversible: true },
      );
      await trx.deleteFrom("events").where("id", "=", candidate.eventId).execute();
      sourceCounts[candidate.sourceSlug] = (sourceCounts[candidate.sourceSlug] ?? 0) + 1;
    }
  });
  return { suppressed: candidates.length, sourceCounts };
}

function groupLinks(
  rows: Array<{ event_id: string; signal_id: string }>,
): Map<string, Array<{ event_id: string; signal_id: string }>> {
  const groups = new Map<string, Array<{ event_id: string; signal_id: string }>>();
  for (const row of rows) {
    const values = groups.get(row.event_id) ?? [];
    values.push(row);
    groups.set(row.event_id, values);
  }
  return groups;
}

function containsPlaceholder(event: EventRow): boolean {
  return [
    event.technical_insight,
    event.industry_insight,
    event.future_outlook,
    event.business_value,
  ].some((value) => /待编辑|待补充|\bTBD\b|\bTODO\b|placeholder/i.test(value));
}
