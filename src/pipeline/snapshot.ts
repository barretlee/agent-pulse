import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, isAbsolute, join } from "node:path";
import type { Kysely, Transaction } from "kysely";
import { parseJson } from "../db/repository.js";
import type { DatabaseSchema } from "../db/types.js";
import { canonicalizeUrl, sha256 } from "../domain/url.js";

export const SNAPSHOT_SCHEMA_VERSION = 1;
export const DEFAULT_SNAPSHOT_PATH = join("data", "snapshot", "v1.json");

interface RepositorySnapshot {
  schemaVersion: number;
  sources: Array<Record<string, unknown>>;
  sourceChecks?: Array<Record<string, unknown>>;
  sourceRuns?: Array<Record<string, unknown>>;
  signals: Array<Record<string, unknown>>;
  signalObservations?: Array<Record<string, unknown>>;
  signalObservationOccurrences?: Array<Record<string, unknown>>;
  signalTriage?: Array<Record<string, unknown>>;
  discoveries: Array<Record<string, unknown>>;
  events: Array<Record<string, unknown>>;
  eventSignals: Array<Record<string, unknown>>;
  eventTracks?: Array<Record<string, unknown>>;
  eventActors?: Array<Record<string, unknown>>;
  eventMerges?: Array<Record<string, unknown>>;
  scoutInsights?: Array<Record<string, unknown>>;
  scoutEvidence?: Array<Record<string, unknown>>;
  evaluationRuns?: Array<Record<string, unknown>>;
}

export async function writeRepositorySnapshot(
  db: Kysely<DatabaseSchema>,
  rootDir: string,
  relativePath = DEFAULT_SNAPSHOT_PATH,
) {
  const snapshot = await buildRepositorySnapshot(db);
  const serialized = `${JSON.stringify(snapshot, null, 2)}\n`;
  assertSnapshotSafe(serialized);
  const path = snapshotPath(rootDir, relativePath);
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
  const path = snapshotPath(rootDir, relativePath);
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
  const [
    sourceRows,
    sourceCheckRows,
    signalRows,
    observationRows,
    observationOccurrenceRows,
    triageRows,
    discoveryRows,
    eventRows,
    eventSignalRows,
    eventTrackRows,
    eventActorRows,
    eventMergeRows,
  ] = await Promise.all([
    db.selectFrom("sources").selectAll().execute(),
    db
      .selectFrom("source_checks")
      .innerJoin("sources", "sources.id", "source_checks.source_id")
      .selectAll("source_checks")
      .select("sources.slug as sourceSlug")
      .execute(),
    db
      .selectFrom("signals")
      .innerJoin("sources", "sources.id", "signals.source_id")
      .selectAll("signals")
      .select("sources.slug as sourceSlug")
      .execute(),
    db
      .selectFrom("signal_observations")
      .innerJoin("sources", "sources.id", "signal_observations.source_id")
      .selectAll("signal_observations")
      .select("sources.slug as sourceSlug")
      .execute(),
    db
      .selectFrom("signal_observation_occurrences")
      .innerJoin("sources", "sources.id", "signal_observation_occurrences.source_id")
      .selectAll("signal_observation_occurrences")
      .select("sources.slug as sourceSlug")
      .execute(),
    db.selectFrom("signal_triage").selectAll().execute(),
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
    db
      .selectFrom("event_tracks")
      .innerJoin("tracks", "tracks.id", "event_tracks.track_id")
      .selectAll("event_tracks")
      .select("tracks.slug as trackSlug")
      .execute(),
    db
      .selectFrom("event_actors")
      .innerJoin("actors", "actors.id", "event_actors.actor_id")
      .selectAll("event_actors")
      .select("actors.slug as actorSlug")
      .execute(),
    db
      .selectFrom("event_merges")
      .innerJoin("events", "events.id", "event_merges.target_event_id")
      .selectAll("event_merges")
      .select("events.slug as targetEventSlug")
      .execute(),
  ]);
  const sourceSlugById = new Map(sourceRows.map((source) => [source.id, source.slug]));
  const [sourceRunRows, scoutRows, scoutEvidenceRows, evaluationRows] = await Promise.all([
    db
      .selectFrom("source_runs")
      .innerJoin("sources", "sources.id", "source_runs.source_id")
      .selectAll("source_runs")
      .select("sources.slug as sourceSlug")
      .orderBy("source_runs.started_at", "desc")
      .execute(),
    db.selectFrom("scout_insights").selectAll().where("status", "=", "published").execute(),
    db
      .selectFrom("scout_evidence")
      .innerJoin("scout_insights", "scout_insights.id", "scout_evidence.insight_id")
      .innerJoin("events", "events.id", "scout_evidence.event_id")
      .select([
        "scout_insights.slug as insightSlug",
        "events.slug as eventSlug",
        "scout_evidence.evidence_role as evidenceRole",
        "scout_evidence.weight as weight",
        "scout_evidence.created_at as createdAt",
      ])
      .where("scout_insights.status", "=", "published")
      .execute(),
    db.selectFrom("evaluation_runs").selectAll().orderBy("finished_at", "asc").execute(),
  ]);
  const snapshot: RepositorySnapshot = {
    schemaVersion: SNAPSHOT_SCHEMA_VERSION,
    sources: sourceRows
      .map((source) => ({
        slug: source.slug,
        enabled: source.enabled,
        observationEnabled: source.observation_enabled,
        lifecycleStatus: source.lifecycle_status,
        healthScore: source.health_score,
        consecutiveFailures: source.consecutive_failures,
        successCount: source.success_count,
        failureCount: source.failure_count,
        lastCollectedAt: source.last_collected_at,
        lastSuccessAt: source.last_success_at,
        lastError: source.last_error,
        lastVerifiedAt: source.last_verified_at,
        state: safeSourceState(parseJson(source.state_json, {})),
      }))
      .sort(byString("slug")),
    sourceChecks: sourceCheckRows
      .map((check) => ({
        id: check.id,
        sourceSlug: check.sourceSlug,
        status: check.status,
        adapter: check.adapter,
        adapterVersion: check.adapter_version,
        accessStatus: check.access_status,
        fetchStatus: check.fetch_status,
        parseStatus: check.parse_status,
        schemaStatus: check.schema_status,
        policyStatus: check.policy_status,
        httpStatus: check.http_status,
        finalUrl: check.final_url ? snapshotUrl(check.final_url) : null,
        contentType: check.content_type,
        responseBytes: check.response_bytes,
        itemCount: check.item_count,
        duplicateCount: check.duplicate_count,
        duplicateRatioBps: check.duplicate_ratio_bps,
        qualityScore: check.quality_score,
        latestItemAt: check.latest_item_at,
        freshnessHours: check.freshness_hours,
        errorType: check.error_type,
        errorCode: check.error_code,
        errorSummary: check.error_summary,
        repairAction: check.repair_action,
        proxyHint: check.proxy_hint,
        proxyUsed: check.proxy_used,
        retentionDecision: check.retention_decision,
        recommendedLifecycle: check.recommended_lifecycle,
        startedAt: check.started_at,
        finishedAt: check.finished_at,
        durationMs: check.duration_ms,
      }))
      .sort((left, right) =>
        `${left.sourceSlug}:${left.finishedAt}:${left.id}`.localeCompare(
          `${right.sourceSlug}:${right.finishedAt}:${right.id}`,
        ),
      ),
    sourceRuns: sourceRunRows
      .map((run) => ({
        id: run.id,
        sourceSlug: run.sourceSlug,
        status: run.status,
        attemptCount: run.attempt_count,
        durationMs: run.duration_ms,
        collectedCount: run.collected_count,
        createdCount: run.created_count,
        skippedCount: run.skipped_count,
        httpStatus: run.http_status,
        responseBytes: run.response_bytes,
        errorType: run.error_type,
        errorCode: run.error_code,
        errorSummary: run.error_summary,
        startedAt: run.started_at,
        finishedAt: run.finished_at,
      }))
      .sort((left, right) =>
        `${left.sourceSlug}:${left.startedAt}:${left.id}`.localeCompare(
          `${right.sourceSlug}:${right.startedAt}:${right.id}`,
        ),
      ),
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
          summary: snapshotExcerpt(signal.summary),
          author: signal.author,
          language: signal.language,
          publishedAt: signal.published_at,
          category: signal.category,
          tags: parseJson(signal.tags_json, []),
          metrics: snapshotMetrics(parseJson(signal.metrics_json, {})),
          contentHash: signal.content_hash,
          createdAt: signal.created_at,
          updatedAt: signal.updated_at,
        };
      })
      .sort(byString("urlHash")),
    signalObservations: observationRows
      .map((observation) => ({
        signalId: observation.signal_id,
        sourceSlug: observation.sourceSlug,
        externalId: observation.external_id,
        observedUrl: snapshotUrl(observation.observed_url),
        firstSeenAt: observation.first_seen_at,
        lastSeenAt: observation.last_seen_at,
        observationCount: observation.observation_count,
      }))
      .sort((left, right) =>
        `${left.signalId}:${left.sourceSlug}`.localeCompare(
          `${right.signalId}:${right.sourceSlug}`,
        ),
      ),
    signalObservationOccurrences: observationOccurrenceRows
      .map((occurrence) => ({
        id: occurrence.id,
        signalId: occurrence.signal_id,
        sourceSlug: occurrence.sourceSlug,
        observedAt: occurrence.observed_at,
        countDelta: occurrence.count_delta,
      }))
      .sort(byString("id")),
    signalTriage: triageRows
      .map((triage) => ({
        signalId: triage.signal_id,
        status: triage.status,
        reason: triage.reason,
        eventabilityScore: triage.eventability_score,
        details: parseJson(triage.details_json, {}),
        createdAt: triage.created_at,
        updatedAt: triage.updated_at,
      }))
      .sort(byString("signalId")),
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
          summary: snapshotExcerpt(discovery.summary),
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
          lastSeenAt: discovery.last_seen_at,
          createdAt: discovery.created_at,
          updatedAt: discovery.updated_at,
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
        updatedAt: event.updated_at,
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
    eventTracks: eventTrackRows
      .map((link) => ({
        eventId: link.event_id,
        trackSlug: link.trackSlug,
        nodeRole: link.node_role,
        narrative: link.narrative,
        stage: link.stage,
        orderIndex: link.order_index,
        createdAt: link.created_at,
      }))
      .sort((left, right) =>
        `${left.eventId}:${left.trackSlug}`.localeCompare(`${right.eventId}:${right.trackSlug}`),
      ),
    eventActors: eventActorRows
      .map((link) => ({
        eventId: link.event_id,
        actorSlug: link.actorSlug,
        actorRole: link.actor_role,
        progressStage: link.progress_stage,
        relevanceScore: link.relevance_score,
        createdAt: link.created_at,
      }))
      .sort((left, right) =>
        `${left.eventId}:${left.actorSlug}`.localeCompare(`${right.eventId}:${right.actorSlug}`),
      ),
    eventMerges: eventMergeRows
      .map((merge) => ({
        id: merge.id,
        targetEventSlug: merge.targetEventSlug,
        sourceEventId: merge.source_event_id,
        sourceSnapshot: parseJson(merge.source_snapshot_json, {}),
        reason: merge.reason,
        mergedBy: merge.merged_by,
        createdAt: merge.created_at,
      }))
      .sort(byString("id")),
    scoutInsights: scoutRows.map((insight) => ({
      id: insight.id,
      slug: insight.slug,
      kind: insight.kind,
      status: insight.status,
      title: insight.title,
      observation: insight.observation,
      hypothesis: insight.hypothesis,
      whyNow: insight.why_now,
      targetAudience: insight.target_audience,
      suggestedAction: insight.suggested_action,
      artifactIdea: insight.artifact_idea,
      counterSignals: insight.counter_signals,
      horizon: insight.horizon,
      confidenceScore: insight.confidence_score,
      evidenceScore: insight.evidence_score,
      noveltyScore: insight.novelty_score,
      leverageScore: insight.leverage_score,
      totalScore: insight.total_score,
      generatedAt: insight.generated_at,
      expiresAt: insight.expires_at,
      publishedAt: insight.published_at,
      createdAt: insight.created_at,
    })),
    scoutEvidence: scoutEvidenceRows.map((link) => ({
      insightSlug: link.insightSlug,
      eventSlug: link.eventSlug,
      evidenceRole: link.evidenceRole,
      weight: link.weight,
      createdAt: link.createdAt,
    })),
    evaluationRuns: evaluationRows.map((evaluation) => ({
      id: evaluation.id,
      releaseVersion: evaluation.release_version,
      status: evaluation.status,
      overallScore: evaluation.overall_score,
      dimensions: parseJson(evaluation.dimensions_json, []),
      capabilities: parseJson(evaluation.capability_snapshot_json, []),
      notes: evaluation.notes,
      startedAt: evaluation.started_at,
      finishedAt: evaluation.finished_at,
    })),
  };
  return sanitizeSnapshotValue(snapshot) as RepositorySnapshot;
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
    const current = sources.find((source) => source.id === sourceId);
    if (!current) continue;
    const incomingLatest = latestTimestamp(
      optionalString(value.lastVerifiedAt),
      optionalString(value.lastCollectedAt),
    );
    const currentLatest = latestTimestamp(current.last_verified_at, current.last_collected_at);
    const incomingIsNewer = compareTimestamp(incomingLatest, currentLatest) >= 0;
    await db
      .updateTable("sources")
      .set({
        enabled: incomingIsNewer ? requiredNumber(value, "enabled") : current.enabled,
        observation_enabled: incomingIsNewer
          ? typeof value.observationEnabled === "number"
            ? value.observationEnabled
            : 0
          : current.observation_enabled,
        lifecycle_status: incomingIsNewer
          ? requiredString(value, "lifecycleStatus")
          : current.lifecycle_status,
        health_score: incomingIsNewer ? requiredNumber(value, "healthScore") : current.health_score,
        consecutive_failures: incomingIsNewer
          ? requiredNumber(value, "consecutiveFailures")
          : current.consecutive_failures,
        success_count: Math.max(current.success_count, optionalNumber(value.successCount) ?? 0),
        failure_count: Math.max(current.failure_count, optionalNumber(value.failureCount) ?? 0),
        last_collected_at: latestTimestamp(
          current.last_collected_at,
          optionalString(value.lastCollectedAt),
        ),
        last_success_at: latestTimestamp(
          current.last_success_at,
          optionalString(value.lastSuccessAt),
        ),
        last_error: incomingIsNewer ? optionalString(value.lastError) : current.last_error,
        last_verified_at: latestTimestamp(
          current.last_verified_at,
          optionalString(value.lastVerifiedAt),
        ),
        state_json: incomingIsNewer ? JSON.stringify(value.state ?? {}) : current.state_json,
      })
      .where("id", "=", sourceId)
      .execute();
  }

  for (const value of snapshot.sourceChecks ?? []) {
    const sourceId = sourceIdBySlug.get(requiredString(value, "sourceSlug"));
    if (!sourceId) continue;
    const id = requiredString(value, "id");
    const existing = await db
      .selectFrom("source_checks")
      .select("id")
      .where("id", "=", id)
      .executeTakeFirst();
    const row = {
      source_id: sourceId,
      job_id: null,
      status: requiredString(value, "status"),
      adapter: requiredString(value, "adapter"),
      adapter_version: requiredString(value, "adapterVersion"),
      access_status: requiredString(value, "accessStatus"),
      fetch_status: requiredString(value, "fetchStatus"),
      parse_status: requiredString(value, "parseStatus"),
      schema_status: requiredString(value, "schemaStatus"),
      policy_status: requiredString(value, "policyStatus"),
      http_status: optionalNumber(value.httpStatus),
      final_url: optionalString(value.finalUrl),
      content_type: optionalString(value.contentType),
      response_bytes: requiredNumber(value, "responseBytes"),
      item_count: requiredNumber(value, "itemCount"),
      duplicate_count: requiredNumber(value, "duplicateCount"),
      duplicate_ratio_bps: requiredNumber(value, "duplicateRatioBps"),
      quality_score: requiredNumber(value, "qualityScore"),
      latest_item_at: optionalString(value.latestItemAt),
      freshness_hours: optionalNumber(value.freshnessHours),
      error_type: optionalString(value.errorType),
      error_code: optionalString(value.errorCode),
      error_summary: optionalString(value.errorSummary),
      repair_action: requiredString(value, "repairAction"),
      proxy_hint: requiredString(value, "proxyHint"),
      proxy_used: requiredNumber(value, "proxyUsed"),
      retention_decision: requiredString(value, "retentionDecision"),
      recommended_lifecycle: requiredString(value, "recommendedLifecycle"),
      sample_json: "{}",
      started_at: requiredString(value, "startedAt"),
      finished_at: requiredString(value, "finishedAt"),
      duration_ms: requiredNumber(value, "durationMs"),
    };
    if (!existing)
      await db
        .insertInto("source_checks")
        .values({ id, ...row })
        .execute();
  }

  if ((snapshot.sourceRuns?.length ?? 0) > 0) {
    const jobId = "snapshot-source-runs";
    const existingJob = await db
      .selectFrom("jobs")
      .select("id")
      .where("id", "=", jobId)
      .executeTakeFirst();
    if (!existingJob) {
      const startedAt = requiredString(snapshot.sourceRuns?.[0] ?? {}, "startedAt");
      await db
        .insertInto("jobs")
        .values({
          id: jobId,
          type: "snapshot_restore",
          status: "succeeded",
          source_id: null,
          started_at: startedAt,
          finished_at: startedAt,
          collected_count: 0,
          created_count: 0,
          skipped_count: 0,
          error_count: 0,
          error_summary: null,
          details_json: "{}",
        })
        .execute();
    }
    for (const value of snapshot.sourceRuns ?? []) {
      const sourceId = sourceIdBySlug.get(requiredString(value, "sourceSlug"));
      if (!sourceId) continue;
      const id = requiredString(value, "id");
      const existing = await db
        .selectFrom("source_runs")
        .select("id")
        .where("id", "=", id)
        .executeTakeFirst();
      const row = {
        source_id: sourceId,
        job_id: jobId,
        status: requiredString(value, "status"),
        attempt_count: requiredNumber(value, "attemptCount"),
        duration_ms: requiredNumber(value, "durationMs"),
        collected_count: requiredNumber(value, "collectedCount"),
        created_count: requiredNumber(value, "createdCount"),
        skipped_count: requiredNumber(value, "skippedCount"),
        http_status: optionalNumber(value.httpStatus),
        response_bytes: requiredNumber(value, "responseBytes"),
        error_type: optionalString(value.errorType),
        error_code: optionalString(value.errorCode),
        error_summary: optionalString(value.errorSummary),
        started_at: requiredString(value, "startedAt"),
        finished_at: optionalString(value.finishedAt),
      };
      if (!existing)
        await db
          .insertInto("source_runs")
          .values({ id, ...row })
          .execute();
    }
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
      .selectAll()
      .where("url_hash", "=", urlHash)
      .executeTakeFirst();
    const id = existing?.id ?? snapshotId;
    const incomingUpdatedAt = optionalString(value.updatedAt) ?? requiredString(value, "createdAt");
    const incomingTitle = requiredString(value, "title");
    const incomingSummary = requiredString(value, "summary");
    const incomingTags = Array.isArray(value.tags) ? value.tags : [];
    const incomingMetrics = asRecord(value.metrics);
    const row = {
      source_id: sourceId,
      external_id: optionalString(value.externalId),
      canonical_url: canonicalUrl,
      url_hash: urlHash,
      title: incomingTitle,
      summary: incomingSummary,
      author: optionalString(value.author),
      language: requiredString(value, "language"),
      published_at: requiredString(value, "publishedAt"),
      collected_at: requiredString(value, "createdAt"),
      category: requiredString(value, "category"),
      tags_json: JSON.stringify(incomingTags),
      metrics_json: JSON.stringify(incomingMetrics),
      raw_meta_json: "{}",
      content_hash: requiredString(value, "contentHash"),
      created_at: requiredString(value, "createdAt"),
      updated_at: incomingUpdatedAt,
    };
    if (existing) {
      const tags = [
        ...new Set([...parseJson<string[]>(existing.tags_json, []), ...incomingTags.map(String)]),
      ].slice(0, 20);
      const title = incomingTitle.length > existing.title.length ? incomingTitle : existing.title;
      const summary =
        incomingSummary.length > existing.summary.length ? incomingSummary : existing.summary;
      const incomingIsNewer = compareTimestamp(incomingUpdatedAt, existing.updated_at) > 0;
      await db
        .updateTable("signals")
        .set({
          title,
          summary,
          author: existing.author ?? row.author,
          language: incomingIsNewer ? row.language : existing.language,
          category: incomingIsNewer ? row.category : existing.category,
          tags_json: JSON.stringify(tags),
          metrics_json: JSON.stringify({
            ...incomingMetrics,
            ...parseJson<Record<string, unknown>>(existing.metrics_json, {}),
          }),
          content_hash: sha256(`${title}\n${summary}`),
          collected_at:
            latestTimestamp(existing.collected_at, row.collected_at) ?? existing.collected_at,
          updated_at:
            latestTimestamp(existing.updated_at, incomingUpdatedAt) ?? existing.updated_at,
        })
        .where("id", "=", id)
        .execute();
    } else
      await db
        .insertInto("signals")
        .values({ id, ...row })
        .execute();
    signalIdMap.set(snapshotId, id);
  }

  const observations =
    snapshot.signalObservations ??
    snapshot.signals.map((signal) => ({
      signalId: signal.id,
      sourceSlug: signal.sourceSlug,
      externalId: signal.externalId,
      observedUrl: signal.canonicalUrl,
      firstSeenAt: signal.createdAt,
      lastSeenAt: signal.updatedAt ?? signal.createdAt,
      observationCount: 1,
    }));
  for (const value of observations) {
    const signalId = signalIdMap.get(requiredString(value, "signalId"));
    const sourceId = sourceIdBySlug.get(requiredString(value, "sourceSlug"));
    if (!signalId || !sourceId) continue;
    const existing = await db
      .selectFrom("signal_observations")
      .selectAll()
      .where("signal_id", "=", signalId)
      .where("source_id", "=", sourceId)
      .executeTakeFirst();
    const firstSeenAt = requiredString(value, "firstSeenAt");
    const lastSeenAt = requiredString(value, "lastSeenAt");
    const observationCount = requiredNumber(value, "observationCount");
    if (existing) {
      await db
        .updateTable("signal_observations")
        .set({
          external_id: existing.external_id ?? optionalString(value.externalId),
          observed_url: snapshotUrl(requiredString(value, "observedUrl")),
          first_seen_at: earliestTimestamp(existing.first_seen_at, firstSeenAt),
          last_seen_at: latestTimestamp(existing.last_seen_at, lastSeenAt) ?? existing.last_seen_at,
          observation_count: Math.max(existing.observation_count, observationCount),
        })
        .where("signal_id", "=", signalId)
        .where("source_id", "=", sourceId)
        .execute();
    } else {
      await db
        .insertInto("signal_observations")
        .values({
          signal_id: signalId,
          source_id: sourceId,
          external_id: optionalString(value.externalId),
          observed_url: snapshotUrl(requiredString(value, "observedUrl")),
          first_seen_at: firstSeenAt,
          last_seen_at: lastSeenAt,
          observation_count: observationCount,
        })
        .execute();
    }
  }

  const occurrences =
    snapshot.signalObservationOccurrences ??
    observations.map((observation) => ({
      id: `baseline:${requiredString(observation, "signalId")}:${requiredString(
        observation,
        "sourceSlug",
      )}`,
      signalId: observation.signalId,
      sourceSlug: observation.sourceSlug,
      observedAt: observation.lastSeenAt,
      countDelta: observation.observationCount,
    }));
  for (const value of occurrences) {
    if (!requiredString(value, "id").startsWith("baseline:")) continue;
    const signalId = signalIdMap.get(requiredString(value, "signalId"));
    const sourceId = sourceIdBySlug.get(requiredString(value, "sourceSlug"));
    if (!signalId || !sourceId) continue;
    await db
      .deleteFrom("signal_observation_occurrences")
      .where("signal_id", "=", signalId)
      .where("source_id", "=", sourceId)
      .where("id", "like", "initial:%")
      .execute();
  }
  for (const value of occurrences) {
    const signalId = signalIdMap.get(requiredString(value, "signalId"));
    const sourceId = sourceIdBySlug.get(requiredString(value, "sourceSlug"));
    if (!signalId || !sourceId) continue;
    await db
      .insertInto("signal_observation_occurrences")
      .values({
        id: requiredString(value, "id"),
        signal_id: signalId,
        source_id: sourceId,
        observed_at: requiredString(value, "observedAt"),
        count_delta: requiredNumber(value, "countDelta"),
      })
      .onConflict((conflict) => conflict.column("id").doNothing())
      .execute();
  }
  const occurrenceTotals = await db
    .selectFrom("signal_observation_occurrences")
    .select(["signal_id", "source_id"])
    .select(({ fn }) => fn.sum<number>("count_delta").as("total"))
    .groupBy(["signal_id", "source_id"])
    .execute();
  for (const total of occurrenceTotals) {
    await db
      .updateTable("signal_observations")
      .set({ observation_count: Number(total.total) })
      .where("signal_id", "=", total.signal_id)
      .where("source_id", "=", total.source_id)
      .execute();
  }

  const eventIdMap = new Map<string, string>();
  for (const value of snapshot.events) {
    const snapshotId = requiredString(value, "id");
    const slug = requiredString(value, "slug");
    const existing = await db
      .selectFrom("events")
      .selectAll()
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
      updated_at: optionalString(value.updatedAt) ?? requiredString(value, "createdAt"),
    };
    if (existing && shouldReplaceEvent(existing, value, row.updated_at))
      await db.updateTable("events").set(row).where("id", "=", id).execute();
    else if (!existing)
      await db
        .insertInto("events")
        .values({ id, ...row })
        .execute();
    eventIdMap.set(snapshotId, id);
    eventIdMap.set(slug, id);
  }

  for (const value of snapshot.signalTriage ?? []) {
    const signalId = signalIdMap.get(requiredString(value, "signalId"));
    if (!signalId) continue;
    const existing = await db
      .selectFrom("signal_triage")
      .selectAll()
      .where("signal_id", "=", signalId)
      .executeTakeFirst();
    const row = {
      status: requiredString(value, "status"),
      reason: requiredString(value, "reason"),
      eventability_score: requiredNumber(value, "eventabilityScore"),
      details_json: JSON.stringify(value.details ?? {}),
      updated_at: optionalString(value.updatedAt) ?? requiredString(value, "createdAt"),
    };
    if (existing) {
      if (compareTimestamp(row.updated_at, existing.updated_at) >= 0) {
        await db.updateTable("signal_triage").set(row).where("signal_id", "=", signalId).execute();
      }
    } else {
      await db
        .insertInto("signal_triage")
        .values({ signal_id: signalId, created_at: requiredString(value, "createdAt"), ...row })
        .execute();
    }
  }

  for (const value of snapshot.discoveries) {
    const aggregatorSourceId = sourceIdBySlug.get(requiredString(value, "aggregatorSlug"));
    if (!aggregatorSourceId) continue;
    const identityHash = requiredString(value, "identityHash");
    const existing = await db
      .selectFrom("source_discoveries")
      .selectAll()
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
      last_seen_at: optionalString(value.lastSeenAt) ?? requiredString(value, "firstSeenAt"),
      created_at: requiredString(value, "createdAt"),
      updated_at: optionalString(value.updatedAt) ?? requiredString(value, "createdAt"),
    };
    if (existing) {
      const incomingIsNewer = compareTimestamp(row.updated_at, existing.updated_at) > 0;
      await db
        .updateTable("source_discoveries")
        .set({
          ...(incomingIsNewer ? row : {}),
          summary: row.summary.length > existing.summary.length ? row.summary : existing.summary,
          first_seen_at: earliestTimestamp(existing.first_seen_at, row.first_seen_at),
          last_seen_at:
            latestTimestamp(existing.last_seen_at, row.last_seen_at) ?? existing.last_seen_at,
          metrics_json: JSON.stringify({
            ...parseJson<Record<string, unknown>>(row.metrics_json, {}),
            ...parseJson<Record<string, unknown>>(existing.metrics_json, {}),
          }),
          updated_at: latestTimestamp(existing.updated_at, row.updated_at) ?? existing.updated_at,
        })
        .where("id", "=", id)
        .execute();
    } else
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

  const tracks = await db.selectFrom("tracks").select(["id", "slug"]).execute();
  const trackIdBySlug = new Map(tracks.map((track) => [track.slug, track.id]));
  for (const value of snapshot.eventTracks ?? []) {
    const eventId = eventIdMap.get(requiredString(value, "eventId"));
    const trackId = trackIdBySlug.get(requiredString(value, "trackSlug"));
    if (!eventId || !trackId) continue;
    await db
      .insertInto("event_tracks")
      .values({
        event_id: eventId,
        track_id: trackId,
        node_role: requiredString(value, "nodeRole"),
        narrative: requiredString(value, "narrative"),
        stage: requiredString(value, "stage"),
        order_index: requiredNumber(value, "orderIndex"),
        created_at: requiredString(value, "createdAt"),
      })
      .onConflict((conflict) => conflict.columns(["event_id", "track_id"]).doNothing())
      .execute();
  }

  const actors = await db.selectFrom("actors").select(["id", "slug"]).execute();
  const actorIdBySlug = new Map(actors.map((actor) => [actor.slug, actor.id]));
  for (const value of snapshot.eventActors ?? []) {
    const eventId = eventIdMap.get(requiredString(value, "eventId"));
    const actorId = actorIdBySlug.get(requiredString(value, "actorSlug"));
    if (!eventId || !actorId) continue;
    await db
      .insertInto("event_actors")
      .values({
        event_id: eventId,
        actor_id: actorId,
        actor_role: requiredString(value, "actorRole"),
        progress_stage: requiredString(value, "progressStage"),
        relevance_score: requiredNumber(value, "relevanceScore"),
        created_at: requiredString(value, "createdAt"),
      })
      .onConflict((conflict) => conflict.columns(["event_id", "actor_id"]).doNothing())
      .execute();
  }

  for (const value of snapshot.eventMerges ?? []) {
    const targetEventId = eventIdMap.get(requiredString(value, "targetEventSlug"));
    if (!targetEventId) continue;
    await db
      .insertInto("event_merges")
      .values({
        id: requiredString(value, "id"),
        target_event_id: targetEventId,
        source_event_id: requiredString(value, "sourceEventId"),
        source_snapshot_json: JSON.stringify(asRecord(value.sourceSnapshot)),
        reason: requiredString(value, "reason"),
        merged_by: requiredString(value, "mergedBy"),
        created_at: requiredString(value, "createdAt"),
      })
      .onConflict((conflict) => conflict.column("id").doNothing())
      .execute();
  }

  const scoutIdBySlug = new Map<string, string>();
  for (const value of snapshot.scoutInsights ?? []) {
    const slug = requiredString(value, "slug");
    const existing = await db
      .selectFrom("scout_insights")
      .select("id")
      .where("slug", "=", slug)
      .executeTakeFirst();
    const id = existing?.id ?? requiredString(value, "id");
    const row = {
      slug,
      kind: requiredString(value, "kind"),
      status: "published",
      title: requiredString(value, "title"),
      observation: requiredString(value, "observation"),
      hypothesis: requiredString(value, "hypothesis"),
      why_now: requiredString(value, "whyNow"),
      target_audience: requiredString(value, "targetAudience"),
      suggested_action: requiredString(value, "suggestedAction"),
      artifact_idea: requiredString(value, "artifactIdea"),
      counter_signals: requiredString(value, "counterSignals"),
      horizon: requiredString(value, "horizon"),
      confidence_score: requiredNumber(value, "confidenceScore"),
      evidence_score: requiredNumber(value, "evidenceScore"),
      novelty_score: requiredNumber(value, "noveltyScore"),
      leverage_score: requiredNumber(value, "leverageScore"),
      total_score: requiredNumber(value, "totalScore"),
      cooldown_key: `snapshot:${slug}`,
      generated_at: requiredString(value, "generatedAt"),
      expires_at: optionalString(value.expiresAt),
      published_at: optionalString(value.publishedAt),
      created_at: requiredString(value, "createdAt"),
      updated_at: requiredString(value, "createdAt"),
    };
    if (existing) await db.updateTable("scout_insights").set(row).where("id", "=", id).execute();
    else
      await db
        .insertInto("scout_insights")
        .values({ id, ...row })
        .execute();
    scoutIdBySlug.set(slug, id);
  }
  for (const value of snapshot.scoutEvidence ?? []) {
    const insightId = scoutIdBySlug.get(requiredString(value, "insightSlug"));
    const eventId = eventIdMap.get(requiredString(value, "eventSlug"));
    if (!insightId || !eventId) continue;
    await db
      .insertInto("scout_evidence")
      .values({
        insight_id: insightId,
        event_id: eventId,
        evidence_role: requiredString(value, "evidenceRole"),
        weight: requiredNumber(value, "weight"),
        created_at: requiredString(value, "createdAt"),
      })
      .onConflict((conflict) => conflict.columns(["insight_id", "event_id"]).doNothing())
      .execute();
  }

  for (const value of snapshot.evaluationRuns ?? []) {
    await db
      .insertInto("evaluation_runs")
      .values({
        id: requiredString(value, "id"),
        release_version: requiredString(value, "releaseVersion"),
        status: requiredString(value, "status"),
        overall_score: requiredNumber(value, "overallScore"),
        dimensions_json: JSON.stringify(Array.isArray(value.dimensions) ? value.dimensions : []),
        capability_snapshot_json: JSON.stringify(
          Array.isArray(value.capabilities) ? value.capabilities : [],
        ),
        notes: requiredString(value, "notes"),
        started_at: requiredString(value, "startedAt"),
        finished_at: requiredString(value, "finishedAt"),
      })
      .onConflict((conflict) => conflict.column("id").doNothing())
      .execute();
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

function snapshotPath(rootDir: string, path: string): string {
  return isAbsolute(path) ? path : join(rootDir, path);
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

function snapshotExcerpt(value: string): string {
  const compact = value.normalize("NFKC").replace(/\s+/g, " ").trim();
  if (compact.length <= 320) return compact;
  return `${compact.slice(0, 319).trimEnd()}…`;
}

function sanitizeSnapshotValue(value: unknown): unknown {
  if (typeof value === "string") return sanitizeSnapshotText(value);
  if (Array.isArray(value)) return value.map(sanitizeSnapshotValue);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, item]) => [
      key,
      sanitizeSnapshotValue(item),
    ]),
  );
}

function sanitizeSnapshotText(value: string): string {
  const sanitized = value
    .replace(/\/Users\/[A-Za-z0-9._-]+(?:\/[^\s"'`<>]*)?/g, "[local-path]")
    .replace(/\/home\/[A-Za-z0-9._-]+(?:\/[^\s"'`<>]*)?/g, "[local-path]")
    .replace(/[A-Za-z]:\\Users\\[^\\\s"'`<>]+(?:\\[^\s"'`<>]*)*/g, "[local-path]");
  if (sanitized.length <= 2_000) return sanitized;
  return `${sanitized.slice(0, 1_999).trimEnd()}…`;
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

function optionalNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function compareTimestamp(left: string | null, right: string | null): number {
  if (left === right) return 0;
  if (!left) return -1;
  if (!right) return 1;
  return left.localeCompare(right);
}

function latestTimestamp(...values: Array<string | null>): string | null {
  return (
    values
      .filter((value): value is string => Boolean(value))
      .sort()
      .at(-1) ?? null
  );
}

function earliestTimestamp(...values: string[]): string {
  return [...values].sort()[0] ?? values[0] ?? "";
}

function shouldReplaceEvent(
  existing: DatabaseSchema["events"],
  incoming: Record<string, unknown>,
  incomingUpdatedAt: string,
): boolean {
  const incomingManual = requiredNumber(incoming, "manualOverride");
  if (incomingManual !== existing.manual_override) return incomingManual > existing.manual_override;
  const statusRank = (status: string) => (status === "published" ? 3 : status === "review" ? 2 : 1);
  const rankDifference =
    statusRank(requiredString(incoming, "status")) - statusRank(existing.status);
  if (rankDifference !== 0) return rankDifference > 0;
  return compareTimestamp(incomingUpdatedAt, existing.updated_at) >= 0;
}

function byString(key: string) {
  return (left: Record<string, unknown>, right: Record<string, unknown>) =>
    String(left[key] ?? "").localeCompare(String(right[key] ?? ""));
}

function snapshotCounts(snapshot: RepositorySnapshot) {
  return {
    sources: snapshot.sources.length,
    sourceChecks: snapshot.sourceChecks?.length ?? 0,
    sourceRuns: snapshot.sourceRuns?.length ?? 0,
    signals: snapshot.signals.length,
    signalObservations: snapshot.signalObservations?.length ?? 0,
    signalObservationOccurrences: snapshot.signalObservationOccurrences?.length ?? 0,
    signalTriage: snapshot.signalTriage?.length ?? 0,
    discoveries: snapshot.discoveries.length,
    events: snapshot.events.length,
    eventSignals: snapshot.eventSignals.length,
    eventTracks: snapshot.eventTracks?.length ?? 0,
    eventActors: snapshot.eventActors?.length ?? 0,
    eventMerges: snapshot.eventMerges?.length ?? 0,
    scoutInsights: snapshot.scoutInsights?.length ?? 0,
    scoutEvidence: snapshot.scoutEvidence?.length ?? 0,
    evaluationRuns: snapshot.evaluationRuns?.length ?? 0,
  };
}

function emptyCounts() {
  return {
    sources: 0,
    sourceChecks: 0,
    sourceRuns: 0,
    signals: 0,
    signalObservations: 0,
    signalObservationOccurrences: 0,
    signalTriage: 0,
    discoveries: 0,
    events: 0,
    eventSignals: 0,
    eventTracks: 0,
    eventActors: 0,
    eventMerges: 0,
    scoutInsights: 0,
    scoutEvidence: 0,
    evaluationRuns: 0,
  };
}
