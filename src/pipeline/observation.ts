import type { Kysely } from "kysely";
import { Repository } from "../db/repository.js";
import type { DatabaseSchema } from "../db/types.js";

export interface ObservationEligibility {
  sourceId: string;
  slug: string;
  eligible: boolean;
  observationEnabled: boolean;
  latestStatus: string | null;
  itemCount: number;
  qualityScore: number;
  freshnessHours: number | null;
  reason: string | null;
}

export async function observationEligibility(
  db: Kysely<DatabaseSchema>,
): Promise<ObservationEligibility[]> {
  const repository = new Repository(db);
  const [sources, checks] = await Promise.all([
    repository.listSources(),
    repository.latestSourceChecks(),
  ]);
  const checksBySource = new Map(checks.map((check) => [check.source_id, check]));
  return sources.map((source) => {
    const check = checksBySource.get(source.id);
    const reason = observationRejection(source, check);
    return {
      sourceId: source.id,
      slug: source.slug,
      eligible: reason === null,
      observationEnabled: source.observation_enabled === 1,
      latestStatus: check?.status ?? null,
      itemCount: check?.item_count ?? 0,
      qualityScore: check?.quality_score ?? 0,
      freshnessHours: check?.freshness_hours ?? null,
      reason,
    };
  });
}

export async function setObservationMode(
  db: Kysely<DatabaseSchema>,
  sourceId: string,
  enabled: boolean,
): Promise<ObservationEligibility> {
  const eligibility = (await observationEligibility(db)).find((item) => item.sourceId === sourceId);
  if (!eligibility) throw new Error("Source not found");
  if (enabled && !eligibility.eligible) {
    throw new Error(`Source is not eligible for shadow observation: ${eligibility.reason}`);
  }
  await db
    .updateTable("sources")
    .set({ observation_enabled: enabled ? 1 : 0, updated_at: new Date().toISOString() })
    .where("id", "=", sourceId)
    .execute();
  return { ...eligibility, observationEnabled: enabled };
}

export async function releaseObservationTriage(
  db: Kysely<DatabaseSchema>,
  sourceId: string,
): Promise<number> {
  const rows = await db
    .selectFrom("signal_triage")
    .innerJoin("signals", "signals.id", "signal_triage.signal_id")
    .select("signal_triage.signal_id")
    .where("signals.source_id", "=", sourceId)
    .where("signal_triage.reason", "=", "shadow_observation")
    .execute();
  for (let index = 0; index < rows.length; index += 200) {
    const ids = rows.slice(index, index + 200).map((row) => row.signal_id);
    if (ids.length) await db.deleteFrom("signal_triage").where("signal_id", "in", ids).execute();
  }
  return rows.length;
}

function observationRejection(
  source: {
    lifecycle_status: string;
    role: string;
    source_category: string;
    acquisition: string;
    adapter: string;
  },
  check?: {
    status: string;
    item_count: number;
    quality_score: number;
    freshness_hours: number | null;
    policy_status: string;
  },
): string | null {
  if (source.lifecycle_status !== "shadow") return "lifecycle_not_shadow";
  if (source.role === "aggregator" || source.source_category === "aggregator")
    return "aggregator_discovery_only";
  if (["manual", "social"].includes(source.acquisition) || source.adapter === "manual")
    return "non_automated_source";
  if (!check) return "missing_check";
  if (check.status !== "healthy") return `latest_check_${check.status}`;
  if (check.policy_status !== "allowed_metadata") return `policy_${check.policy_status}`;
  if (check.item_count < 1) return "empty_content";
  if (check.quality_score < 60) return "quality_below_60";
  if (check.freshness_hours === null) return "missing_freshness";
  if (check.freshness_hours > 2_160) return "content_older_than_90_days";
  return null;
}
