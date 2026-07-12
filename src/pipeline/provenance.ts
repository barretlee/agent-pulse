import type { Kysely } from "kysely";
import type { DatabaseSchema } from "../db/types.js";

export interface ProvenanceDebtReport {
  aggregatorSignals: number;
  unattachedSignals: number;
  attachedSignals: number;
  sourceCounts: Array<{ slug: string; count: number }>;
}

export async function inspectProvenanceDebt(
  db: Kysely<DatabaseSchema>,
): Promise<ProvenanceDebtReport> {
  const rows = await db
    .selectFrom("signals")
    .innerJoin("sources", "sources.id", "signals.source_id")
    .leftJoin("event_signals", "event_signals.signal_id", "signals.id")
    .select(["signals.id", "sources.slug", "event_signals.event_id as eventId"])
    .where((expression) =>
      expression.or([
        expression("sources.role", "=", "aggregator"),
        expression("sources.source_category", "=", "aggregator"),
      ]),
    )
    .execute();
  const unique = new Map<string, { slug: string; attached: boolean }>();
  for (const row of rows) {
    const current = unique.get(row.id);
    unique.set(row.id, {
      slug: row.slug,
      attached: (current?.attached ?? false) || !!row.eventId,
    });
  }
  const sourceCounts = new Map<string, number>();
  for (const row of unique.values()) {
    sourceCounts.set(row.slug, (sourceCounts.get(row.slug) ?? 0) + 1);
  }
  return {
    aggregatorSignals: unique.size,
    unattachedSignals: [...unique.values()].filter((row) => !row.attached).length,
    attachedSignals: [...unique.values()].filter((row) => row.attached).length,
    sourceCounts: [...sourceCounts.entries()]
      .map(([slug, count]) => ({ slug, count }))
      .sort((left, right) => right.count - left.count || left.slug.localeCompare(right.slug)),
  };
}

/**
 * Removes only unattached aggregator-owned signals. Attached records are kept
 * for editorial review so cleanup can never silently strip an evidence chain.
 */
export async function purgeUnattachedAggregatorSignals(
  db: Kysely<DatabaseSchema>,
): Promise<{ removed: number; retainedForReview: number }> {
  const rows = await db
    .selectFrom("signals")
    .innerJoin("sources", "sources.id", "signals.source_id")
    .leftJoin("event_signals", "event_signals.signal_id", "signals.id")
    .select(["signals.id", "event_signals.event_id as eventId"])
    .where((expression) =>
      expression.or([
        expression("sources.role", "=", "aggregator"),
        expression("sources.source_category", "=", "aggregator"),
      ]),
    )
    .execute();
  const attached = new Set(rows.filter((row) => row.eventId).map((row) => row.id));
  const removable = [...new Set(rows.map((row) => row.id))].filter((id) => !attached.has(id));
  for (let offset = 0; offset < removable.length; offset += 250) {
    await db
      .deleteFrom("signals")
      .where("id", "in", removable.slice(offset, offset + 250))
      .execute();
  }
  return { removed: removable.length, retainedForReview: attached.size };
}
