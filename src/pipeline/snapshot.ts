import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import type { Kysely, Transaction } from "kysely";
import { parseJson } from "../db/repository.js";
import type { DatabaseSchema } from "../db/types.js";
import { canonicalizeUrl, sha256 } from "../domain/url.js";

export const SNAPSHOT_SCHEMA_VERSION = 1;
export const DEFAULT_SNAPSHOT_PATH = join("data", "snapshot", "v1.json");

interface RepositorySnapshot {
  schemaVersion: number;
  sources: Array<Record<string, unknown>>;
  signals: Array<Record<string, unknown>>;
  discoveries: Array<Record<string, unknown>>;
  events: Array<Record<string, unknown>>;
  eventSignals: Array<Record<string, unknown>>;
}

export async function writeRepositorySnapshot(
  db: Kysely<DatabaseSchema>,
  rootDir: string,
  relativePath = DEFAULT_SNAPSHOT_PATH,
) {
  const snapshot = await buildRepositorySnapshot(db);
  const serialized = `${JSON.stringify(snapshot, null, 2)}\n`;
  assertSnapshotSafe(serialized);
  const path = join(rootDir, relativePath);
  const previous = await readFile(path, "utf8").catch(() => "");
  if (previous === serialized) {
    return { path, changed: false, sha256: sha256(serialized), counts: snapshotCounts(snapshot) };
  }
  await mkdir(dirname(path), { recursive: true });
  const temporary = `${path}.tmp`;
  await writeFile(temporary, serialized, { encoding: "utf8", mode: 0o600 });
  await rename(temporary, path);
  return { path, changed: true, sha256: sha256(serialized), counts: snapshotCounts(snapshot) };
}

export async function restoreRepositorySnapshot(
  db: Kysely<DatabaseSchema>,
  rootDir: string,
  relativePath = DEFAULT_SNAPSHOT_PATH,
) {
  const path = join(rootDir, relativePath);
  const serialized = await readFile(path, "utf8").catch((error: NodeJS.ErrnoException) => {
    if (error.code === "ENOENT") return "";
    throw error;
  });
  if (!serialized) return { path, restored: false, counts: emptyCounts() };
  assertSnapshotSafe(serialized);
  const snapshot = JSON.parse(serialized) as RepositorySnapshot;
  validateSnapshot(snapshot);
  await db.transaction().execute((transaction) => restoreSnapshot(transaction, snapshot));
  return { path, restored: true, counts: snapshotCounts(snapshot) };
}

async function buildRepositorySnapshot(db: Kysely<DatabaseSchema>): Promise<RepositorySnapshot> {
  const [sourceRows, signalRows, discoveryRows, eventRows, eventSignalRows] = await Promise.all([
    db.selectFrom("sources").selectAll().execute(),
    db
      .selectFrom("signals")
      .innerJoin("sources", "sources.id", "signals.source_id")
      .selectAll("signals")
      .select("sources.slug as sourceSlug")
      .execute(),
    db
      .selectFrom("source_discoveries")
      .innerJoin(
        "sources as aggregator",
        "aggregator.id",
        "source_discoveries.aggregator_source_id",
      )
      .leftJoin("sources as matched", "matched.id", "source_discoveries.matched_source_id")
      .selectAll("source_discoveries")
      .select(["aggregator.slug as aggregatorSlug", "matched.slug as matchedSourceSlug"])
      .execute(),
    db.selectFrom("events").selectAll().execute(),
    db.selectFrom("event_signals").selectAll().execute(),
  ]);
  const sourceSlugById = new Map(sourceRows.map((source) => [source.id, source.slug]));

  return {
    schemaVersion: SNAPSHOT_SCHEMA_VERSION,
    sources: sourceRows
      .map((source) => ({
        slug: source.slug,
        enabled: source.enabled,
        lifecycleStatus: source.lifecycle_status,
        healthScore: source.health_score,
        consecutiveFailures: source.consecutive_failures,
        state: safeSourceState(parseJson(source.state_json, {})),
      }))
      .sort(byString("slug")),
    signals: signalRows
      .map((signal) => {
        const canonicalUrl = snapshotUrl(signal.canonical_url);
        return {
          id: signal.id,
          sourceSlug: signal.sourceSlug,
          externalId: signal.external_id,
          canonicalUrl,
          urlHash: sha256(canonicalUrl),
          title: signal.title,
          summary: signal.summary,
          author: signal.author,
          language: signal.language,
          publishedAt: signal.published_at,
          category: signal.category,
          tags: parseJson(signal.tags_json, []),
          metrics: snapshotMetrics(parseJson(signal.metrics_json, {})),
          contentHash: signal.content_hash,
          createdAt: signal.created_at,
        };
      })
      .sort(byString("urlHash")),
    discoveries: discoveryRows
      .map((discovery) => {
        const discoveryUrl = snapshotUrl(discovery.discovery_url);
        const originUrl = discovery.origin_url ? snapshotUrl(discovery.origin_url) : null;
        const candidateSourceSlugs = parseJson<string[]>(discovery.candidate_source_ids_json, [])
          .map((id) => sourceSlugById.get(id))
          .filter((slug): slug is string => Boolean(slug))
          .sort();
        return {
          id: discovery.id,
          identityHash: discovery.identity_hash,
          aggregatorSlug: discovery.aggregatorSlug,
          externalId: discovery.external_id,
          discoveryUrl,
          discoveryUrlHash: sha256(discoveryUrl),
          originUrl,
          originUrlHash: originUrl ? sha256(originUrl) : null,
          originKind: discovery.origin_kind,
          originName: discovery.origin_name,
          handles: parseJson(discovery.handles_json, []),
          title: discovery.title,
          summary: discovery.summary,
          language: discovery.language,
          publishedAt: discovery.published_at,
          category: discovery.category,
          tags: parseJson(discovery.tags_json, []),
          metrics: snapshotMetrics(parseJson(discovery.metrics_json, {})),
          matchedSourceSlug: discovery.matchedSourceSlug,
          candidateSourceSlugs,
          matchedSignalId: discovery.matched_signal_id,
          status: discovery.status,
          firstSeenAt: discovery.first_seen_at,
          createdAt: discovery.created_at,
        };
      })
      .sort(byString("identityHash")),
    events: eventRows
      .map((event) => ({
        id: event.id,
        slug: event.slug,
        title: event.title,
        factSummary: event.fact_summary,
        summary: event.summary,
        technicalInsight: event.technical_insight,
        industryInsight: event.industry_insight,
        futureOutlook: event.future_outlook,
        businessValue: event.business_value,
        category: event.category,
        company: event.company,
        keywords: parseJson(event.keywords_json, []),
        confidenceScore: event.confidence_score,
        heatScore: event.heat_score,
        impactScore: event.impact_score,
        valueScore: event.value_score,
        scoreFactors: parseJson(event.score_factors_json, {}),
        status: event.status,
        featured: event.featured,
        manualOverride: event.manual_override,
        happenedAt: event.happened_at,
        publishedAt: event.published_at,
        createdAt: event.created_at,
      }))
      .sort(byString("slug")),
    eventSignals: eventSignalRows
      .map((link) => ({
        eventId: link.event_id,
        signalId: link.signal_id,
        evidenceRole: link.evidence_role,
        relevanceScore: link.relevance_score,
        createdAt: link.created_at,
      }))
      .sort((left, right) =>
        `${left.eventId}:${left.signalId}`.localeCompare(`${right.eventId}:${right.signalId}`),
      ),
  };
}

async function restoreSnapshot(
  db: Transaction<DatabaseSchema>,
  snapshot: RepositorySnapshot,
): Promise<void> {
  const sources = await db.selectFrom("sources").selectAll().execute();
  const sourceIdBySlug = new Map(sources.map((source) => [source.slug, source.id]));
  for (const value of snapshot.sources) {
    const slug = requiredString(value, "slug");
    const sourceId = sourceIdBySlug.get(slug);
    if (!sourceId) continue;
    await db
      .updateTable("sources")
      .set({
        enabled: requiredNumber(value, "enabled"),
        lifecycle_status: requiredString(value, "lifecycleStatus"),
        health_score: requiredNumber(value, "healthScore"),
        consecutive_failures: requiredNumber(value, "consecutiveFailures"),
        state_json: JSON.stringify(value.state ?? {}),
      })
      .where("id", "=", sourceId)
      .execute();
  }

  const signalIdMap = new Map<string, string>();
  for (const value of snapshot.signals) {
    const sourceId = sourceIdBySlug.get(requiredString(value, "sourceSlug"));
    if (!sourceId) continue;
    const snapshotId = requiredString(value, "id");
    const canonicalUrl = snapshotUrl(requiredString(value, "canonicalUrl"));
    const urlHash = sha256(canonicalUrl);
    const existing = await db
      .selectFrom("signals")
      .select("id")
      .where("url_hash", "=", urlHash)
      .executeTakeFirst();
    const id = existing?.id ?? snapshotId;
    const row = {
      source_id: sourceId,
      external_id: optionalString(value.externalId),
      canonical_url: canonicalUrl,
      url_hash: urlHash,
      title: requiredString(value, "title"),
      summary: requiredString(value, "summary"),
      author: optionalString(value.author),
      language: requiredString(value, "language"),
      published_at: requiredString(value, "publishedAt"),
      collected_at: requiredString(value, "createdAt"),
      category: requiredString(value, "category"),
      tags_json: JSON.stringify(value.tags ?? []),
      metrics_json: JSON.stringify(value.metrics ?? {}),
      raw_meta_json: "{}",
      content_hash: requiredString(value, "contentHash"),
      created_at: requiredString(value, "createdAt"),
      updated_at: requiredString(value, "createdAt"),
    };
    if (existing) await db.updateTable("signals").set(row).where("id", "=", id).execute();
    else
      await db
        .insertInto("signals")
        .values({ id, ...row })
        .execute();
    signalIdMap.set(snapshotId, id);
  }

  const eventIdMap = new Map<string, string>();
  for (const value of snapshot.events) {
    const snapshotId = requiredString(value, "id");
    const slug = requiredString(value, "slug");
    const existing = await db
      .selectFrom("events")
      .select("id")
      .where("slug", "=", slug)
      .executeTakeFirst();
    const id = existing?.id ?? snapshotId;
    const row = {
      slug,
      title: requiredString(value, "title"),
      fact_summary: requiredString(value, "factSummary"),
      summary: requiredString(value, "summary"),
      technical_insight: requiredString(value, "technicalInsight"),
      industry_insight: requiredString(value, "industryInsight"),
      future_outlook: requiredString(value, "futureOutlook"),
      business_value: requiredString(value, "businessValue"),
      category: requiredString(value, "category"),
      company: requiredString(value, "company"),
      keywords_json: JSON.stringify(value.keywords ?? []),
      confidence_score: requiredNumber(value, "confidenceScore"),
      heat_score: requiredNumber(value, "heatScore"),
      impact_score: requiredNumber(value, "impactScore"),
      value_score: requiredNumber(value, "valueScore"),
      score_factors_json: JSON.stringify(value.scoreFactors ?? {}),
      status: requiredString(value, "status"),
      featured: requiredNumber(value, "featured"),
      manual_override: requiredNumber(value, "manualOverride"),
      happened_at: requiredString(value, "happenedAt"),
      published_at: optionalString(value.publishedAt),
      created_at: requiredString(value, "createdAt"),
      updated_at: requiredString(value, "createdAt"),
    };
    if (existing) await db.updateTable("events").set(row).where("id", "=", id).execute();
    else
      await db
        .insertInto("events")
        .values({ id, ...row })
        .execute();
    eventIdMap.set(snapshotId, id);
  }

  for (const value of snapshot.discoveries) {
    const aggregatorSourceId = sourceIdBySlug.get(requiredString(value, "aggregatorSlug"));
    if (!aggregatorSourceId) continue;
    const identityHash = requiredString(value, "identityHash");
    const existing = await db
      .selectFrom("source_discoveries")
      .select("id")
      .where("identity_hash", "=", identityHash)
      .executeTakeFirst();
    const id = existing?.id ?? requiredString(value, "id");
    const discoveryUrl = snapshotUrl(requiredString(value, "discoveryUrl"));
    const originUrl = optionalString(value.originUrl);
    const matchedSourceId =
      sourceIdBySlug.get(optionalString(value.matchedSourceSlug) ?? "") ?? null;
    const candidateSourceIds = Array.isArray(value.candidateSourceSlugs)
      ? value.candidateSourceSlugs
          .filter((slug): slug is string => typeof slug === "string")
          .map((slug) => sourceIdBySlug.get(slug))
          .filter((sourceId): sourceId is string => Boolean(sourceId))
      : [];
    const row = {
      identity_hash: identityHash,
      aggregator_source_id: aggregatorSourceId,
      external_id: optionalString(value.externalId),
      discovery_url: discoveryUrl,
      discovery_url_hash: sha256(discoveryUrl),
      origin_url: originUrl,
      origin_url_hash: originUrl ? sha256(snapshotUrl(originUrl)) : null,
      origin_kind: requiredString(value, "originKind"),
      origin_name: optionalString(value.originName),
      handles_json: JSON.stringify(value.handles ?? []),
      title: requiredString(value, "title"),
      summary: requiredString(value, "summary"),
      language: requiredString(value, "language"),
      published_at: requiredString(value, "publishedAt"),
      category: requiredString(value, "category"),
      tags_json: JSON.stringify(value.tags ?? []),
      metrics_json: JSON.stringify(value.metrics ?? {}),
      raw_meta_json: "{}",
      matched_source_id: matchedSourceId,
      candidate_source_ids_json: JSON.stringify(candidateSourceIds),
      matched_signal_id: signalIdMap.get(optionalString(value.matchedSignalId) ?? "") ?? null,
      status: requiredString(value, "status"),
      first_seen_at: requiredString(value, "firstSeenAt"),
      last_seen_at: requiredString(value, "firstSeenAt"),
      created_at: requiredString(value, "createdAt"),
      updated_at: requiredString(value, "createdAt"),
    };
    if (existing)
      await db.updateTable("source_discoveries").set(row).where("id", "=", id).execute();
    else
      await db
        .insertInto("source_discoveries")
        .values({ id, ...row })
        .execute();
  }

  for (const value of snapshot.eventSignals) {
    const eventId = eventIdMap.get(requiredString(value, "eventId"));
    const signalId = signalIdMap.get(requiredString(value, "signalId"));
    if (!eventId || !signalId) continue;
    const existing = await db
      .selectFrom("event_signals")
      .select("signal_id")
      .where("event_id", "=", eventId)
      .where("signal_id", "=", signalId)
      .executeTakeFirst();
    const row = {
      evidence_role: requiredString(value, "evidenceRole"),
      relevance_score: requiredNumber(value, "relevanceScore"),
      created_at: requiredString(value, "createdAt"),
    };
    if (existing) {
      await db
        .updateTable("event_signals")
        .set(row)
        .where("event_id", "=", eventId)
        .where("signal_id", "=", signalId)
        .execute();
    } else {
      await db
        .insertInto("event_signals")
        .values({ event_id: eventId, signal_id: signalId, ...row })
        .execute();
    }
  }
}

function safeSourceState(value: unknown): Record<string, string> {
  if (!value || typeof value !== "object") return {};
  const source = value as Record<string, unknown>;
  const result: Record<string, string> = {};
  for (const key of ["etag", "lastModified"]) {
    if (typeof source[key] === "string") result[key] = source[key].slice(0, 1_000);
  }
  return result;
}

function snapshotMetrics(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const result = structuredClone(value) as Record<string, unknown>;
  if (
    result.aggregatorHeat &&
    typeof result.aggregatorHeat === "object" &&
    !Array.isArray(result.aggregatorHeat)
  ) {
    const heat = result.aggregatorHeat as Record<string, unknown>;
    delete heat.latestSeenAt;
  }
  return result;
}

function snapshotUrl(value: string): string {
  const url = new URL(canonicalizeUrl(value));
  url.username = "";
  url.password = "";
  for (const key of [...url.searchParams.keys()]) {
    if (
      /(?:^|_)(?:token|secret|password|signature|credential|api[_-]?key|auth)(?:$|_)/i.test(key)
    ) {
      url.searchParams.delete(key);
    }
  }
  url.searchParams.sort();
  return canonicalizeUrl(url.toString());
}

function assertSnapshotSafe(serialized: string): void {
  const forbidden = [
    /"(?:token|secret|password|cookie|authorization|api[_-]?key)"\s*:/i,
    /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
    /\/Users\/[A-Za-z0-9._-]+\//,
    /\/home\/runner\//,
  ];
  const violation = forbidden.find((pattern) => pattern.test(serialized));
  if (violation) throw new Error(`Snapshot privacy check failed: ${violation.source}`);
}

function validateSnapshot(value: RepositorySnapshot): void {
  if (!value || value.schemaVersion !== SNAPSHOT_SCHEMA_VERSION) {
    throw new Error(`Unsupported repository snapshot schema: ${value?.schemaVersion ?? "missing"}`);
  }
  for (const key of ["sources", "signals", "discoveries", "events", "eventSignals"] as const) {
    if (!Array.isArray(value[key])) throw new Error(`Invalid repository snapshot field: ${key}`);
  }
}

function requiredString(value: Record<string, unknown>, key: string): string {
  const result = value[key];
  if (typeof result !== "string") throw new Error(`Snapshot field ${key} must be a string`);
  return result;
}

function requiredNumber(value: Record<string, unknown>, key: string): number {
  const result = value[key];
  if (typeof result !== "number" || !Number.isFinite(result)) {
    throw new Error(`Snapshot field ${key} must be a number`);
  }
  return result;
}

function optionalString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function byString(key: string) {
  return (left: Record<string, unknown>, right: Record<string, unknown>) =>
    String(left[key] ?? "").localeCompare(String(right[key] ?? ""));
}

function snapshotCounts(snapshot: RepositorySnapshot) {
  return {
    sources: snapshot.sources.length,
    signals: snapshot.signals.length,
    discoveries: snapshot.discoveries.length,
    events: snapshot.events.length,
    eventSignals: snapshot.eventSignals.length,
  };
}

function emptyCounts() {
  return { sources: 0, signals: 0, discoveries: 0, events: 0, eventSignals: 0 };
}
