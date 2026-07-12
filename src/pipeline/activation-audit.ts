import type { Kysely } from "kysely";
import { sourceCatalog } from "../catalog/sources.js";
import { Repository } from "../db/repository.js";
import type { DatabaseSchema } from "../db/types.js";

export interface UnqualifiedActivation {
  sourceId: string;
  slug: string;
  lifecycle: string;
  latestCheckStatus: string | null;
  healthyChecks: number;
  observationDays: number;
  reason: string;
}

const catalogActive = new Set(
  sourceCatalog
    .filter((source) => source.lifecycleStatus === "active")
    .map((source) => source.slug),
);

export async function findUnqualifiedActivations(
  db: Kysely<DatabaseSchema>,
): Promise<UnqualifiedActivation[]> {
  const repository = new Repository(db);
  const [sources, checks] = await Promise.all([
    repository.listSources(),
    repository.listSourceChecks(undefined, 2_000),
  ]);
  const checksBySource = new Map<string, typeof checks>();
  for (const check of checks) {
    const rows = checksBySource.get(check.source_id) ?? [];
    rows.push(check);
    checksBySource.set(check.source_id, rows);
  }
  const results: UnqualifiedActivation[] = [];
  for (const source of sources) {
    if (!source.enabled || !["active", "degraded"].includes(source.lifecycle_status)) continue;
    if (catalogActive.has(source.slug)) continue;
    const sourceChecks = checksBySource.get(source.id) ?? [];
    const healthy = sourceChecks.filter((check) => check.status === "healthy");
    const oldestHealthy = healthy.at(-1);
    const observationDays = oldestHealthy
      ? Math.max(0, (Date.now() - new Date(oldestHealthy.finished_at).getTime()) / 86_400_000)
      : 0;
    const qualified =
      sourceChecks[0]?.status === "healthy" && healthy.length >= 20 && observationDays >= 7;
    if (qualified) continue;
    results.push({
      sourceId: source.id,
      slug: source.slug,
      lifecycle: source.lifecycle_status,
      latestCheckStatus: sourceChecks[0]?.status ?? null,
      healthyChecks: healthy.length,
      observationDays: Math.floor(observationDays),
      reason: "Activation predates the reviewed 20-check / 7-day qualification policy",
    });
  }
  return results.sort((left, right) => left.slug.localeCompare(right.slug));
}

export async function reconcileUnqualifiedActivations(
  db: Kysely<DatabaseSchema>,
): Promise<{ movedToShadow: number; slugs: string[] }> {
  const candidates = await findUnqualifiedActivations(db);
  const timestamp = new Date().toISOString();
  for (const candidate of candidates) {
    await db
      .updateTable("sources")
      .set({
        lifecycle_status: "shadow",
        enabled: 0,
        observation_enabled: 0,
        updated_at: timestamp,
      })
      .where("id", "=", candidate.sourceId)
      .execute();
  }
  return { movedToShadow: candidates.length, slugs: candidates.map((item) => item.slug) };
}
