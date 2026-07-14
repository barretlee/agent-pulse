import { randomUUID, timingSafeEqual } from "node:crypto";
import type { Kysely } from "kysely";
import { titleSimilarity } from "../domain/clustering.js";
import {
  type CollectedSignal,
  type OriginReference,
  type PublicEvent,
  SourceConfigSchema,
  type SourceDescriptor,
} from "../domain/types.js";
import { canonicalizeUrl, sha256 } from "../domain/url.js";
import type {
  DatabaseSchema,
  EventRow,
  NewEventRow,
  NewSourceCheckRow,
  NewSourceRow,
  SignalRow,
  SourceDiscoveryRow,
  SourceRow,
  SourceRunRow,
  SourceUpdate,
} from "./types.js";

export type DiscoveryStatus =
  | "pending"
  | "candidate"
  | "matched_source"
  | "merged_signal"
  | "insufficient_identity";

export interface SourceDiscoveryListItem {
  id: string;
  title: string;
  status: DiscoveryStatus;
  aggregator: { id: string; slug: string; name: string };
  source: { id: string; slug: string; name: string };
  rawDomainOrHandle: string;
  originUrl: string | null;
  discoveryUrl: string;
  originKind: string;
  handles: Array<{ handle: string; role?: string }>;
  matchedPrimarySource: { id: string; slug: string; name: string } | null;
  matchedSignalId: string | null;
  metrics: Record<string, unknown>;
  firstDiscoveredAt: string;
  lastDiscoveredAt: string;
}

const now = () => new Date().toISOString();
const json = (value: unknown) => JSON.stringify(value);
export const scoutFingerprint = (kind: string, title: string) =>
  `${kind}:${title
    .normalize("NFKC")
    .toLocaleLowerCase()
    .replace(/[\s\p{P}\p{S}]+/gu, "")}`;
const SHARED_IDENTITY_HOSTS = new Set([
  "bilibili.com",
  "github.com",
  "linkedin.com",
  "medium.com",
  "reddit.com",
  "twitter.com",
  "weibo.com",
  "x.com",
  "youtube.com",
]);
const parseJson = <T>(value: string, fallback: T): T => {
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
};

export class Repository {
  constructor(private readonly db: Kysely<DatabaseSchema>) {}

  async listSources(): Promise<SourceRow[]> {
    return this.db.selectFrom("sources").selectAll().orderBy("tier").orderBy("name").execute();
  }

  async getSource(id: string): Promise<SourceRow | undefined> {
    return this.db.selectFrom("sources").selectAll().where("id", "=", id).executeTakeFirst();
  }

  async getSourceByIdOrSlug(identifier: string): Promise<SourceRow | undefined> {
    return this.db
      .selectFrom("sources")
      .selectAll()
      .where((expression) =>
        expression.or([expression("id", "=", identifier), expression("slug", "=", identifier)]),
      )
      .executeTakeFirst();
  }

  async getEnabledSources(): Promise<SourceRow[]> {
    return this.db
      .selectFrom("sources")
      .selectAll()
      .where((expression) =>
        expression.or([
          expression.and([
            expression("enabled", "=", 1),
            expression("lifecycle_status", "in", ["active", "degraded"]),
          ]),
          expression.and([
            expression("observation_enabled", "=", 1),
            expression("lifecycle_status", "=", "shadow"),
          ]),
        ]),
      )
      .orderBy("priority", "desc")
      .execute();
  }

  async saveSource(input: Omit<NewSourceRow, "created_at" | "updated_at">): Promise<void> {
    const existing = await this.db
      .selectFrom("sources")
      .select("id")
      .where("slug", "=", input.slug)
      .executeTakeFirst();
    const timestamp = now();
    if (existing) {
      await this.db
        .updateTable("sources")
        .set({ ...input, id: existing.id, updated_at: timestamp })
        .where("id", "=", existing.id)
        .execute();
    } else {
      await this.db
        .insertInto("sources")
        .values({ ...input, created_at: timestamp, updated_at: timestamp })
        .execute();
    }
  }

  async saveCatalogSource(input: Omit<NewSourceRow, "created_at" | "updated_at">): Promise<void> {
    const existing = await this.db
      .selectFrom("sources")
      .select("id")
      .where("slug", "=", input.slug)
      .executeTakeFirst();
    const timestamp = now();
    if (!existing) {
      await this.db
        .insertInto("sources")
        .values({ ...input, created_at: timestamp, updated_at: timestamp })
        .execute();
      return;
    }

    await this.db
      .updateTable("sources")
      .set({
        name: input.name,
        homepage_url: input.homepage_url,
        adapter: input.adapter,
        tier: input.tier,
        role: input.role,
        region: input.region,
        language: input.language,
        authority_score: input.authority_score,
        config_json: input.config_json,
        source_category: input.source_category,
        acquisition: input.acquisition,
        topics_json: input.topics_json,
        cadence: input.cadence,
        license_note: input.license_note,
        quality_score: input.quality_score,
        updated_at: timestamp,
      })
      .where("id", "=", existing.id)
      .execute();
  }

  async updateSource(id: string, patch: SourceUpdate): Promise<void> {
    await this.db
      .updateTable("sources")
      .set({ ...patch, updated_at: now() })
      .where("id", "=", id)
      .execute();
  }

  toSourceDescriptor(source: SourceRow): SourceDescriptor {
    const config = SourceConfigSchema.parse(parseJson(source.config_json, null));
    return {
      id: source.id,
      slug: source.slug,
      name: source.name,
      homepageUrl: source.homepage_url,
      adapter: source.adapter,
      tier: source.tier,
      role: source.role,
      region: source.region,
      language: source.language,
      authorityScore: source.authority_score,
      config,
      state: parseJson(source.state_json, {}),
    };
  }

  async startSourceRun(sourceId: string, jobId: string): Promise<string> {
    const id = randomUUID();
    await this.db
      .insertInto("source_runs")
      .values({
        id,
        source_id: sourceId,
        job_id: jobId,
        status: "running",
        attempt_count: 0,
        duration_ms: 0,
        collected_count: 0,
        created_count: 0,
        skipped_count: 0,
        http_status: null,
        response_bytes: 0,
        error_type: null,
        error_code: null,
        error_summary: null,
        started_at: now(),
        finished_at: null,
      })
      .execute();
    return id;
  }

  async finishSourceRun(
    id: string,
    patch: {
      status: string;
      attemptCount: number;
      durationMs: number;
      collected: number;
      created: number;
      skipped: number;
      httpStatus?: number | null;
      responseBytes?: number;
      errorType?: string | null;
      errorCode?: string | null;
      errorSummary?: string | null;
    },
  ): Promise<void> {
    await this.db
      .updateTable("source_runs")
      .set({
        status: patch.status,
        attempt_count: patch.attemptCount,
        duration_ms: patch.durationMs,
        collected_count: patch.collected,
        created_count: patch.created,
        skipped_count: patch.skipped,
        http_status: patch.httpStatus ?? null,
        response_bytes: patch.responseBytes ?? 0,
        error_type: patch.errorType ?? null,
        error_code: patch.errorCode ?? null,
        error_summary: patch.errorSummary?.slice(0, 4_000) ?? null,
        finished_at: now(),
      })
      .where("id", "=", id)
      .execute();
  }

  async listSourceRuns(sourceId?: string, limit = 100): Promise<SourceRunRow[]> {
    let query = this.db.selectFrom("source_runs").selectAll();
    if (sourceId) query = query.where("source_id", "=", sourceId);
    return query.orderBy("started_at", "desc").limit(limit).execute();
  }

  async insertSourceCheck(input: NewSourceCheckRow): Promise<void> {
    await this.db.insertInto("source_checks").values(input).execute();
  }

  async listSourceChecks(sourceId?: string, limit = 500) {
    let query = this.db
      .selectFrom("source_checks")
      .innerJoin("sources", "sources.id", "source_checks.source_id")
      .selectAll("source_checks")
      .select(["sources.slug as source_slug", "sources.name as source_name"]);
    if (sourceId) query = query.where("source_checks.source_id", "=", sourceId);
    return query
      .orderBy("source_checks.finished_at", "desc")
      .limit(Math.min(Math.max(limit, 1), 2_000))
      .execute();
  }

  async latestSourceChecks() {
    const rows = await this.listSourceChecks(undefined, 2_000);
    const latest = new Map<string, (typeof rows)[number]>();
    for (const row of rows) {
      if (!latest.has(row.source_id)) latest.set(row.source_id, row);
    }
    return [...latest.values()];
  }

  async publicSignals() {
    return this.db
      .selectFrom("signals")
      .innerJoin("sources", "sources.id", "signals.source_id")
      .select([
        "signals.title",
        "signals.summary",
        "signals.canonical_url as url",
        "signals.published_at as publishedAt",
        "signals.collected_at as collectedAt",
        "signals.category",
        "signals.tags_json as tagsJson",
        "signals.language",
        "sources.slug as sourceSlug",
        "sources.name as sourceName",
        "sources.tier as sourceTier",
        "sources.role as sourceRole",
        "sources.region as sourceRegion",
      ])
      .where("sources.role", "!=", "aggregator")
      .where("sources.source_category", "!=", "aggregator")
      .orderBy("signals.published_at", "desc")
      .orderBy("signals.collected_at", "desc")
      .execute();
  }

  async listScoutInsights(status?: string) {
    let query = this.db.selectFrom("scout_insights").selectAll();
    if (status) query = query.where("status", "=", status);
    return query.orderBy("total_score", "desc").orderBy("generated_at", "desc").execute();
  }

  async getScoutInsight(id: string) {
    return this.db.selectFrom("scout_insights").selectAll().where("id", "=", id).executeTakeFirst();
  }

  async findRecentScoutInsight(cooldownKey: string, since: string) {
    return this.db
      .selectFrom("scout_insights")
      .select("id")
      .where("cooldown_key", "=", cooldownKey)
      .where("generated_at", ">=", since)
      .executeTakeFirst();
  }

  async insertScoutInsight(
    input: Omit<
      import("./types.js").ScoutInsightTable,
      "id" | "created_at" | "updated_at" | "published_at"
    >,
    eventId: string,
  ): Promise<string> {
    const id = randomUUID();
    const timestamp = now();
    await this.db.transaction().execute(async (transaction) => {
      await transaction
        .insertInto("scout_insights")
        .values({
          ...input,
          id,
          published_at: input.status === "published" ? timestamp : null,
          created_at: timestamp,
          updated_at: timestamp,
        })
        .execute();
      await transaction
        .insertInto("scout_evidence")
        .values({
          insight_id: id,
          event_id: eventId,
          evidence_role: "trigger",
          weight: 100,
          created_at: timestamp,
        })
        .execute();
    });
    return id;
  }

  async updateScoutInsight(id: string, patch: Partial<import("./types.js").ScoutInsightTable>) {
    await this.db
      .updateTable("scout_insights")
      .set({ ...patch, updated_at: now() })
      .where("id", "=", id)
      .execute();
  }

  async publicScoutInsights() {
    const insights = await this.listScoutInsights("published");
    const uniqueInsights = [...insights]
      .sort(
        (left, right) =>
          right.confidence_score - left.confidence_score ||
          right.evidence_score - left.evidence_score ||
          right.total_score - left.total_score ||
          String(right.published_at).localeCompare(String(left.published_at)),
      )
      .filter((insight, index, rows) => {
        const fingerprint = scoutFingerprint(insight.kind, insight.title);
        return (
          rows.findIndex(
            (candidate) => scoutFingerprint(candidate.kind, candidate.title) === fingerprint,
          ) === index
        );
      });
    return Promise.all(
      uniqueInsights.map(async (insight) => {
        const evidence = await this.db
          .selectFrom("scout_evidence")
          .innerJoin("events", "events.id", "scout_evidence.event_id")
          .select(["events.slug", "events.title", "events.fact_summary as factSummary"])
          .where("scout_evidence.insight_id", "=", insight.id)
          .execute();
        return {
          slug: insight.slug,
          kind: insight.kind,
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
          publishedAt: insight.published_at,
          evidence,
        };
      }),
    );
  }

  async saveSourceDiscovery(
    aggregatorSourceId: string,
    item: CollectedSignal,
  ): Promise<{ discovery: SourceDiscoveryRow; created: boolean }> {
    const aggregator = await this.getSource(aggregatorSourceId);
    if (!aggregator || !isDiscoveryOnlySource(aggregator)) {
      throw new Error("Only aggregator sources can persist source discoveries");
    }

    const origin: OriginReference = item.origin ?? {
      discoveryUrl: item.url,
      kind: "unknown",
    };
    const discoveryUrl = canonicalizeUrl(origin.discoveryUrl);
    const originUrl = origin.url ? canonicalizeUrl(origin.url) : null;
    const handles = normalizeHandles(origin);
    const match = await this.matchDirectSource(originUrl, origin.name, handles);
    const identityHash = sha256(
      `${aggregatorSourceId}\n${item.externalId ?? originUrl ?? discoveryUrl}`,
    );
    const timestamp = now();
    const existing = await this.db
      .selectFrom("source_discoveries")
      .selectAll()
      .where("identity_hash", "=", identityHash)
      .executeTakeFirst();
    const status: DiscoveryStatus = existing?.matched_signal_id
      ? "merged_signal"
      : match.sourceId
        ? "matched_source"
        : match.candidateSourceIds.length
          ? "candidate"
          : "pending";

    if (existing) {
      await this.db
        .updateTable("source_discoveries")
        .set({
          external_id: item.externalId?.slice(0, 255) ?? null,
          discovery_url: discoveryUrl,
          discovery_url_hash: sha256(discoveryUrl),
          origin_url: originUrl,
          origin_url_hash: originUrl ? sha256(originUrl) : null,
          origin_kind: origin.kind,
          origin_name: origin.name?.slice(0, 255) ?? null,
          handles_json: json(handles),
          title: item.title.slice(0, 2_000),
          summary: item.summary.slice(0, 8_000),
          language: item.language,
          published_at: item.publishedAt,
          category: item.category,
          tags_json: json(item.tags.slice(0, 20)),
          metrics_json: json(item.metrics),
          raw_meta_json: json(item.rawMeta),
          matched_source_id: existing.matched_signal_id
            ? existing.matched_source_id
            : match.sourceId,
          candidate_source_ids_json: json(match.candidateSourceIds),
          status,
          last_seen_at: timestamp,
          updated_at: timestamp,
        })
        .where("id", "=", existing.id)
        .execute();
    } else {
      await this.db
        .insertInto("source_discoveries")
        .values({
          id: randomUUID(),
          identity_hash: identityHash,
          aggregator_source_id: aggregatorSourceId,
          external_id: item.externalId?.slice(0, 255) ?? null,
          discovery_url: discoveryUrl,
          discovery_url_hash: sha256(discoveryUrl),
          origin_url: originUrl,
          origin_url_hash: originUrl ? sha256(originUrl) : null,
          origin_kind: origin.kind,
          origin_name: origin.name?.slice(0, 255) ?? null,
          handles_json: json(handles),
          title: item.title.slice(0, 2_000),
          summary: item.summary.slice(0, 8_000),
          language: item.language,
          published_at: item.publishedAt,
          category: item.category,
          tags_json: json(item.tags.slice(0, 20)),
          metrics_json: json(item.metrics),
          raw_meta_json: json(item.rawMeta),
          matched_source_id: match.sourceId,
          candidate_source_ids_json: json(match.candidateSourceIds),
          matched_signal_id: null,
          status,
          first_seen_at: timestamp,
          last_seen_at: timestamp,
          created_at: timestamp,
          updated_at: timestamp,
        })
        .execute();
    }

    let discovery = await this.db
      .selectFrom("source_discoveries")
      .selectAll()
      .where("identity_hash", "=", identityHash)
      .executeTakeFirstOrThrow();
    const signal = await this.findSignalForDiscovery(discovery);
    if (signal) {
      await this.mergeDiscoveryHeatIntoSignal(signal, [discovery]);
      discovery = await this.db
        .selectFrom("source_discoveries")
        .selectAll()
        .where("id", "=", discovery.id)
        .executeTakeFirstOrThrow();
    }
    return { discovery, created: !existing };
  }

  async listSourceDiscoveries(
    limit = 100,
    status?: DiscoveryStatus,
  ): Promise<SourceDiscoveryListItem[]> {
    let query = this.db
      .selectFrom("source_discoveries")
      .innerJoin(
        "sources as aggregator",
        "aggregator.id",
        "source_discoveries.aggregator_source_id",
      )
      .leftJoin("sources as matched", "matched.id", "source_discoveries.matched_source_id")
      .select([
        "source_discoveries.id",
        "source_discoveries.title",
        "source_discoveries.status",
        "source_discoveries.origin_url as originUrl",
        "source_discoveries.discovery_url as discoveryUrl",
        "source_discoveries.origin_kind as originKind",
        "source_discoveries.handles_json as handlesJson",
        "source_discoveries.metrics_json as metricsJson",
        "source_discoveries.matched_signal_id as matchedSignalId",
        "source_discoveries.first_seen_at as firstSeenAt",
        "source_discoveries.last_seen_at as lastSeenAt",
        "aggregator.id as aggregatorId",
        "aggregator.slug as aggregatorSlug",
        "aggregator.name as aggregatorName",
        "matched.id as matchedId",
        "matched.slug as matchedSlug",
        "matched.name as matchedName",
      ]);
    if (status) query = query.where("source_discoveries.status", "=", status);
    const rows = await query
      .orderBy("source_discoveries.last_seen_at", "desc")
      .limit(Math.min(Math.max(limit, 1), 500))
      .execute();
    return rows.map((row) => {
      const aggregator = {
        id: row.aggregatorId,
        slug: row.aggregatorSlug,
        name: row.aggregatorName,
      };
      const handles = parseJson<Array<{ handle: string; role?: string }>>(row.handlesJson, []);
      return {
        id: row.id,
        title: row.title,
        status: row.status as DiscoveryStatus,
        aggregator,
        source: aggregator,
        rawDomainOrHandle: discoveryIdentity(row.originUrl, handles, row.discoveryUrl),
        originUrl: row.originUrl,
        discoveryUrl: row.discoveryUrl,
        originKind: row.originKind,
        handles,
        matchedPrimarySource: row.matchedId
          ? { id: row.matchedId, slug: row.matchedSlug ?? "", name: row.matchedName ?? "" }
          : null,
        matchedSignalId: row.matchedSignalId,
        metrics: parseJson(row.metricsJson, {}),
        firstDiscoveredAt: row.firstSeenAt,
        lastDiscoveredAt: row.lastSeenAt,
      };
    });
  }

  async discoveryStatusSummary(): Promise<Record<DiscoveryStatus | "total", number>> {
    const rows = await this.db
      .selectFrom("source_discoveries")
      .select(["status", ({ fn }) => fn.countAll<number>().as("count")])
      .groupBy("status")
      .execute();
    const summary: Record<DiscoveryStatus | "total", number> = {
      pending: 0,
      candidate: 0,
      matched_source: 0,
      merged_signal: 0,
      insufficient_identity: 0,
      total: 0,
    };
    for (const row of rows) {
      const count = Number(row.count);
      if (row.status in summary) summary[row.status as DiscoveryStatus] = count;
      summary.total += count;
    }
    return summary;
  }

  private async matchDirectSource(
    originUrl: string | null,
    originName: string | undefined,
    handles: Array<{ handle: string; role?: string }>,
  ): Promise<{ sourceId: string | null; candidateSourceIds: string[] }> {
    const sources = (await this.listSources()).filter((source) => !isDiscoveryOnlySource(source));
    const candidates = new Set<string>();
    if (originUrl) {
      const origin = new URL(originUrl);
      const originHost = normalizeHost(origin.hostname);
      const prefixMatches = sources
        .map((source) => ({ source, homepage: safeUrl(source.homepage_url) }))
        .filter(({ homepage }) => {
          if (!homepage || normalizeHost(homepage.hostname) !== originHost) return false;
          const homepageValue = canonicalizeUrl(homepage.toString());
          return originUrl === homepageValue || originUrl.startsWith(`${homepageValue}/`);
        });
      if (prefixMatches.length) {
        const longest = Math.max(
          ...prefixMatches.map(
            ({ homepage }) => canonicalizeUrl(homepage?.toString() ?? "").length,
          ),
        );
        const mostSpecific = prefixMatches.filter(
          ({ homepage }) => canonicalizeUrl(homepage?.toString() ?? "").length === longest,
        );
        if (mostSpecific.length === 1) {
          return { sourceId: mostSpecific[0]?.source.id ?? null, candidateSourceIds: [] };
        }
        for (const { source } of mostSpecific) candidates.add(source.id);
      }

      if (!SHARED_IDENTITY_HOSTS.has(originHost)) {
        const configuredHostMatches = sources.filter((source) =>
          configuredIdentityHosts(source).includes(originHost),
        );
        if (configuredHostMatches.length === 1) {
          return { sourceId: configuredHostMatches[0]?.id ?? null, candidateSourceIds: [] };
        }
        for (const source of configuredHostMatches) candidates.add(source.id);
      }

      if (!SHARED_IDENTITY_HOSTS.has(originHost)) {
        const hostMatches = sources.filter((source) => {
          const homepage = safeUrl(source.homepage_url);
          return homepage ? normalizeHost(homepage.hostname) === originHost : false;
        });
        if (hostMatches.length === 1) {
          return { sourceId: hostMatches[0]?.id ?? null, candidateSourceIds: [] };
        }
        for (const source of hostMatches) candidates.add(source.id);
      }
    }

    const normalizedHandles = new Set(
      handles.map((item) => normalizeHandle(item.handle)).filter(Boolean),
    );
    if (normalizedHandles.size) {
      const handleMatches = sources.filter((source) =>
        sourceHandles(source).some((handle) => normalizedHandles.has(handle)),
      );
      if (handleMatches.length === 1) {
        return { sourceId: handleMatches[0]?.id ?? null, candidateSourceIds: [] };
      }
      for (const source of handleMatches) candidates.add(source.id);
    }

    const normalizedName = normalizeIdentity(originName ?? "");
    if (normalizedName) {
      const nameMatches = sources.filter(
        (source) =>
          normalizeIdentity(source.name) === normalizedName ||
          normalizeIdentity(source.slug) === normalizedName,
      );
      if (nameMatches.length === 1) {
        return { sourceId: nameMatches[0]?.id ?? null, candidateSourceIds: [] };
      }
      for (const source of nameMatches) candidates.add(source.id);
    }
    return { sourceId: null, candidateSourceIds: [...candidates] };
  }

  private async findSignalForDiscovery(
    discovery: SourceDiscoveryRow,
  ): Promise<SignalRow | undefined> {
    if (discovery.origin_url_hash) {
      const exact = await this.db
        .selectFrom("signals")
        .innerJoin("sources", "sources.id", "signals.source_id")
        .selectAll("signals")
        .where("signals.url_hash", "=", discovery.origin_url_hash)
        .where("sources.source_category", "!=", "aggregator")
        .where("sources.role", "!=", "aggregator")
        .executeTakeFirst();
      if (exact) return exact;
    }
    if (!discovery.matched_source_id) return undefined;
    const signals = await this.db
      .selectFrom("signals")
      .selectAll()
      .where("source_id", "=", discovery.matched_source_id)
      .orderBy("published_at", "desc")
      .limit(200)
      .execute();
    return signals
      .filter((signal) => discoveryMatchesSignal(discovery, signal))
      .sort(
        (left, right) =>
          titleSimilarity(discovery.title, right.title) -
          titleSimilarity(discovery.title, left.title),
      )[0];
  }

  private async mergePendingDiscoveriesIntoSignal(signal: SignalRow): Promise<void> {
    const discoveries = await this.db
      .selectFrom("source_discoveries")
      .selectAll()
      .where("matched_signal_id", "is", null)
      .where((expression) =>
        expression.or([
          expression("origin_url_hash", "=", signal.url_hash),
          expression("matched_source_id", "=", signal.source_id),
        ]),
      )
      .limit(500)
      .execute();
    const matches = discoveries.filter(
      (discovery) =>
        discovery.origin_url_hash === signal.url_hash || discoveryMatchesSignal(discovery, signal),
    );
    if (matches.length) await this.mergeDiscoveryHeatIntoSignal(signal, matches);
  }

  private async mergeDiscoveryHeatIntoSignal(
    signal: SignalRow,
    discoveries: SourceDiscoveryRow[],
  ): Promise<void> {
    const ids = discoveries.map((discovery) => discovery.id);
    if (!ids.length) return;
    await this.db
      .updateTable("source_discoveries")
      .set({
        matched_source_id: signal.source_id,
        matched_signal_id: signal.id,
        status: "merged_signal",
        updated_at: now(),
      })
      .where("id", "in", ids)
      .execute();
    const linked = await this.db
      .selectFrom("source_discoveries")
      .selectAll()
      .where("matched_signal_id", "=", signal.id)
      .execute();
    const metrics = mergeDiscoveryMetrics(
      parseJson<Record<string, unknown>>(signal.metrics_json, {}),
      linked,
    );
    await this.db
      .updateTable("signals")
      .set({ metrics_json: json(metrics), updated_at: now() })
      .where("id", "=", signal.id)
      .execute();
  }

  async insertSignal(sourceId: string, item: CollectedSignal): Promise<SignalRow | undefined> {
    const source = await this.getSource(sourceId);
    if (!source) throw new Error(`Source not found: ${sourceId}`);
    if (isDiscoveryOnlySource(source)) {
      throw new Error("Aggregator sources cannot create factual signals");
    }
    const canonicalUrl = canonicalizeUrl(item.url);
    const urlHash = sha256(canonicalUrl);
    const existing = await this.db
      .selectFrom("signals")
      .selectAll()
      .where("url_hash", "=", urlHash)
      .executeTakeFirst();
    if (existing) {
      const timestamp = now();
      await this.upsertSignalObservation(existing.id, sourceId, item, canonicalUrl, timestamp);
      const existingTags = parseJson<string[]>(existing.tags_json, []);
      const incomingTags = item.tags.slice(0, 20);
      const tags = [...new Set([...existingTags, ...incomingTags])].slice(0, 20);
      const existingMetrics = parseJson<Record<string, unknown>>(existing.metrics_json, {});
      const title =
        item.title.length > existing.title.length ? item.title.slice(0, 2_000) : existing.title;
      const summary =
        item.summary.length > existing.summary.length
          ? item.summary.slice(0, 8_000)
          : existing.summary;
      await this.db
        .updateTable("signals")
        .set({
          title,
          summary,
          author: existing.author ?? item.author?.slice(0, 255) ?? null,
          tags_json: json(tags),
          metrics_json: json({ ...existingMetrics, ...item.metrics }),
          updated_at: timestamp,
        })
        .where("id", "=", existing.id)
        .execute();
      await this.mergePendingDiscoveriesIntoSignal(existing);
      return undefined;
    }

    const timestamp = now();
    const id = randomUUID();
    await this.db
      .insertInto("signals")
      .values({
        id,
        source_id: sourceId,
        external_id: item.externalId ?? null,
        canonical_url: canonicalUrl,
        url_hash: urlHash,
        title: item.title.slice(0, 2_000),
        summary: item.summary.slice(0, 8_000),
        author: item.author?.slice(0, 255) ?? null,
        language: item.language,
        published_at: item.publishedAt,
        collected_at: timestamp,
        category: item.category,
        tags_json: json(item.tags.slice(0, 20)),
        metrics_json: json(item.metrics),
        raw_meta_json: json(item.rawMeta),
        content_hash: sha256(`${item.title}\n${item.summary}`),
        created_at: timestamp,
        updated_at: timestamp,
      })
      .execute();
    await this.upsertSignalObservation(id, sourceId, item, canonicalUrl, timestamp);
    const inserted = await this.db
      .selectFrom("signals")
      .selectAll()
      .where("id", "=", id)
      .executeTakeFirst();
    if (!inserted) return undefined;
    await this.mergePendingDiscoveriesIntoSignal(inserted);
    return this.db.selectFrom("signals").selectAll().where("id", "=", id).executeTakeFirst();
  }

  private async upsertSignalObservation(
    signalId: string,
    sourceId: string,
    item: CollectedSignal,
    canonicalUrl: string,
    timestamp: string,
  ): Promise<void> {
    const existing = await this.db
      .selectFrom("signal_observations")
      .selectAll()
      .where("signal_id", "=", signalId)
      .where("source_id", "=", sourceId)
      .executeTakeFirst();
    await this.db
      .insertInto("signal_observation_occurrences")
      .values({
        id: existing ? randomUUID() : `initial:${sha256(`${canonicalUrl}:${sourceId}`)}`,
        signal_id: signalId,
        source_id: sourceId,
        observed_at: timestamp,
        count_delta: 1,
      })
      .onConflict((conflict) => conflict.column("id").doNothing())
      .execute();
    if (existing) {
      await this.db
        .updateTable("signal_observations")
        .set({
          external_id: item.externalId ?? existing.external_id,
          observed_url: canonicalUrl,
          last_seen_at: timestamp,
          observation_count: existing.observation_count + 1,
        })
        .where("signal_id", "=", signalId)
        .where("source_id", "=", sourceId)
        .execute();
      return;
    }
    await this.db
      .insertInto("signal_observations")
      .values({
        signal_id: signalId,
        source_id: sourceId,
        external_id: item.externalId ?? null,
        observed_url: canonicalUrl,
        first_seen_at: timestamp,
        last_seen_at: timestamp,
        observation_count: 1,
      })
      .execute();
  }

  async listUnclusteredSignals(limit = 200): Promise<SignalRow[]> {
    return this.db
      .selectFrom("signals")
      .innerJoin("sources", "sources.id", "signals.source_id")
      .leftJoin("event_signals", "event_signals.signal_id", "signals.id")
      .leftJoin("signal_triage", "signal_triage.signal_id", "signals.id")
      .selectAll("signals")
      .where("event_signals.signal_id", "is", null)
      .where("signal_triage.signal_id", "is", null)
      .where("sources.role", "!=", "aggregator")
      .where("sources.source_category", "!=", "aggregator")
      .orderBy("signals.published_at", "desc")
      .limit(limit)
      .execute();
  }

  async deferSignal(
    signalId: string,
    reason: string,
    eventabilityScore: number,
    details: Record<string, unknown>,
  ): Promise<void> {
    const existing = await this.db
      .selectFrom("signal_triage")
      .select("signal_id")
      .where("signal_id", "=", signalId)
      .executeTakeFirst();
    const value = {
      status: "deferred",
      reason: reason.slice(0, 120),
      eventability_score: eventabilityScore,
      details_json: json(details),
      updated_at: now(),
    };
    if (existing) {
      await this.db
        .updateTable("signal_triage")
        .set(value)
        .where("signal_id", "=", signalId)
        .execute();
    } else {
      await this.db
        .insertInto("signal_triage")
        .values({ ...value, signal_id: signalId, created_at: now() })
        .execute();
    }
  }

  async clearSignalTriage(signalId: string): Promise<void> {
    await this.db.deleteFrom("signal_triage").where("signal_id", "=", signalId).execute();
  }

  async listDeferredSignalsNear(isoDate: string, days = 21, limit = 500): Promise<SignalRow[]> {
    const center = new Date(isoDate).getTime();
    const radius = days * 86_400_000;
    return this.db
      .selectFrom("signal_triage")
      .innerJoin("signals", "signals.id", "signal_triage.signal_id")
      .selectAll("signals")
      .where("signal_triage.status", "=", "deferred")
      .where("signals.published_at", ">=", new Date(center - radius).toISOString())
      .where("signals.published_at", "<=", new Date(center + radius).toISOString())
      .orderBy("signals.published_at", "desc")
      .limit(limit)
      .execute();
  }

  async listEvents(status?: string): Promise<EventRow[]> {
    let query = this.db.selectFrom("events").selectAll();
    if (status) query = query.where("status", "=", status);
    return query.orderBy("featured", "desc").orderBy("happened_at", "desc").execute();
  }

  async getEvent(id: string): Promise<EventRow | undefined> {
    return this.db.selectFrom("events").selectAll().where("id", "=", id).executeTakeFirst();
  }

  async insertEvent(event: NewEventRow): Promise<void> {
    await this.db.insertInto("events").values(event).execute();
  }

  async updateEvent(id: string, patch: Partial<NewEventRow>): Promise<void> {
    await this.db
      .updateTable("events")
      .set({ ...patch, updated_at: now() })
      .where("id", "=", id)
      .execute();
  }

  async attachSignal(
    eventId: string,
    signalId: string,
    evidenceRole: string,
    relevanceScore: number,
  ): Promise<void> {
    const exists = await this.db
      .selectFrom("event_signals")
      .select("signal_id")
      .where("event_id", "=", eventId)
      .where("signal_id", "=", signalId)
      .executeTakeFirst();
    if (exists) return;
    await this.db
      .insertInto("event_signals")
      .values({
        event_id: eventId,
        signal_id: signalId,
        evidence_role: evidenceRole,
        relevance_score: relevanceScore,
        created_at: now(),
      })
      .execute();
  }

  async publicEvents(): Promise<PublicEvent[]> {
    const events = await this.listEvents("published");
    if (!events.length) return [];
    const evidenceRows = await this.db
      .selectFrom("event_signals")
      .innerJoin("signals", "signals.id", "event_signals.signal_id")
      .innerJoin("sources", "sources.id", "signals.source_id")
      .select([
        "event_signals.event_id as eventId",
        "signals.title as title",
        "signals.canonical_url as url",
        "signals.published_at as publishedAt",
        "sources.name as source",
        "event_signals.evidence_role as role",
      ])
      .where(
        "event_signals.event_id",
        "in",
        events.map((event) => event.id),
      )
      .orderBy("event_signals.event_id")
      .orderBy("event_signals.relevance_score", "desc")
      .execute();
    const evidenceByEvent = new Map<string, PublicEvent["evidence"]>();
    for (const { eventId, ...evidence } of evidenceRows) {
      const items = evidenceByEvent.get(eventId) ?? [];
      if (items.length < 8) items.push(evidence);
      evidenceByEvent.set(eventId, items);
    }
    return events.map((event) =>
      this.publicEventFromRow(event, evidenceByEvent.get(event.id) ?? []),
    );
  }

  async toPublicEvent(event: EventRow): Promise<PublicEvent> {
    const evidence = await this.db
      .selectFrom("event_signals")
      .innerJoin("signals", "signals.id", "event_signals.signal_id")
      .innerJoin("sources", "sources.id", "signals.source_id")
      .select([
        "signals.title as title",
        "signals.canonical_url as url",
        "signals.published_at as publishedAt",
        "sources.name as source",
        "event_signals.evidence_role as role",
      ])
      .where("event_signals.event_id", "=", event.id)
      .orderBy("event_signals.relevance_score", "desc")
      .limit(8)
      .execute();

    return this.publicEventFromRow(event, evidence);
  }

  private publicEventFromRow(event: EventRow, evidence: PublicEvent["evidence"]): PublicEvent {
    return {
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
      scoreFactors: parseJson(event.score_factors_json, {
        authority: 0,
        corroboration: 0,
        primaryEvidence: 0,
        uniqueAuthors: 0,
        independentSources: 0,
        platformBreadth: 0,
        regionBreadth: 0,
        velocity: 0,
        freshness: 0,
        crossRegion: false,
      }),
      featured: event.featured === 1,
      happenedAt: event.happened_at,
      publishedAt: event.published_at,
      evidence,
    };
  }

  async dashboard(): Promise<Record<string, number>> {
    const [sources, signals, drafts, published, failedJobs, degradedSources, scoutInbox] =
      await Promise.all([
        this.db
          .selectFrom("sources")
          .select(({ fn }) => fn.countAll<number>().as("count"))
          .executeTakeFirstOrThrow(),
        this.db
          .selectFrom("signals")
          .select(({ fn }) => fn.countAll<number>().as("count"))
          .executeTakeFirstOrThrow(),
        this.db
          .selectFrom("events")
          .select(({ fn }) => fn.countAll<number>().as("count"))
          .where("status", "in", ["draft", "review"])
          .executeTakeFirstOrThrow(),
        this.db
          .selectFrom("events")
          .select(({ fn }) => fn.countAll<number>().as("count"))
          .where("status", "=", "published")
          .executeTakeFirstOrThrow(),
        this.db
          .selectFrom("jobs")
          .select(({ fn }) => fn.countAll<number>().as("count"))
          .where("status", "=", "failed")
          .executeTakeFirstOrThrow(),
        this.db
          .selectFrom("sources")
          .select(({ fn }) => fn.countAll<number>().as("count"))
          .where("lifecycle_status", "in", ["degraded", "quarantined"])
          .executeTakeFirstOrThrow(),
        this.db
          .selectFrom("scout_insights")
          .select(({ fn }) => fn.countAll<number>().as("count"))
          .where("status", "in", ["inbox", "considering"])
          .executeTakeFirstOrThrow(),
      ]);
    return {
      sources: Number(sources.count),
      signals: Number(signals.count),
      drafts: Number(drafts.count),
      published: Number(published.count),
      failedJobs: Number(failedJobs.count),
      degradedSources: Number(degradedSources.count),
      scoutInbox: Number(scoutInbox.count),
    };
  }

  async eventScoringContext(eventId: string): Promise<
    Array<{
      sourceId: string;
      sourceSlug: string;
      authorityScore: number;
      tier: number;
      role: string;
      sourceCategory: string;
      metrics: Record<string, unknown>;
      publishedAt: string;
    }>
  > {
    const rows = await this.db
      .selectFrom("event_signals")
      .innerJoin("signals", "signals.id", "event_signals.signal_id")
      .innerJoin("sources", "sources.id", "signals.source_id")
      .select([
        "sources.id as sourceId",
        "sources.slug as sourceSlug",
        "sources.authority_score as authorityScore",
        "sources.tier as tier",
        "sources.role as role",
        "sources.source_category as sourceCategory",
        "signals.metrics_json as metricsJson",
        "signals.published_at as publishedAt",
      ])
      .where("event_signals.event_id", "=", eventId)
      .execute();
    return rows.map((row) => ({
      sourceId: row.sourceId,
      sourceSlug: row.sourceSlug,
      authorityScore: row.authorityScore,
      tier: row.tier,
      role: row.role,
      sourceCategory: row.sourceCategory,
      metrics: parseJson(row.metricsJson, {}),
      publishedAt: row.publishedAt,
    }));
  }

  async listTracks() {
    return this.db
      .selectFrom("tracks")
      .selectAll()
      .where("enabled", "=", 1)
      .orderBy("order_index")
      .execute();
  }

  async listActors() {
    return this.db
      .selectFrom("actors")
      .selectAll()
      .where("enabled", "=", 1)
      .orderBy("table_score", "desc")
      .orderBy("name")
      .execute();
  }

  async listResources() {
    return this.db
      .selectFrom("model_resources")
      .selectAll()
      .where("enabled", "=", 1)
      .orderBy("provider")
      .orderBy("model")
      .execute();
  }

  async getDefaultView() {
    return this.db
      .selectFrom("views")
      .selectAll()
      .where("is_default", "=", 1)
      .where("status", "=", "published")
      .executeTakeFirst();
  }

  async eventTracks(eventId: string) {
    return this.db
      .selectFrom("event_tracks")
      .innerJoin("tracks", "tracks.id", "event_tracks.track_id")
      .select([
        "tracks.slug",
        "tracks.name",
        "tracks.color",
        "tracks.icon",
        "event_tracks.node_role as role",
        "event_tracks.narrative",
        "event_tracks.stage",
        "event_tracks.order_index as orderIndex",
      ])
      .where("event_tracks.event_id", "=", eventId)
      .orderBy("event_tracks.order_index")
      .execute();
  }

  async eventActors(eventId: string) {
    return this.db
      .selectFrom("event_actors")
      .innerJoin("actors", "actors.id", "event_actors.actor_id")
      .select([
        "actors.slug",
        "actors.name",
        "actors.region",
        "actors.actor_type as actorType",
        "actors.table_score as tableScore",
        "event_actors.actor_role as role",
        "event_actors.progress_stage as progressStage",
      ])
      .where("event_actors.event_id", "=", eventId)
      .execute();
  }

  async publicEventRelations(eventIds: readonly string[]) {
    if (!eventIds.length) return { tracks: new Map(), actors: new Map() };
    const ids = [...eventIds];
    const [trackRows, actorRows] = await Promise.all([
      this.db
        .selectFrom("event_tracks")
        .innerJoin("tracks", "tracks.id", "event_tracks.track_id")
        .select([
          "event_tracks.event_id as eventId",
          "tracks.slug",
          "tracks.name",
          "tracks.color",
          "tracks.icon",
          "event_tracks.node_role as role",
          "event_tracks.narrative",
          "event_tracks.stage",
          "event_tracks.order_index as orderIndex",
        ])
        .where("event_tracks.event_id", "in", ids)
        .orderBy("event_tracks.event_id")
        .orderBy("event_tracks.order_index")
        .execute(),
      this.db
        .selectFrom("event_actors")
        .innerJoin("actors", "actors.id", "event_actors.actor_id")
        .select([
          "event_actors.event_id as eventId",
          "actors.slug",
          "actors.name",
          "actors.region",
          "actors.actor_type as actorType",
          "actors.table_score as tableScore",
          "event_actors.actor_role as role",
          "event_actors.progress_stage as progressStage",
        ])
        .where("event_actors.event_id", "in", ids)
        .orderBy("event_actors.event_id")
        .execute(),
    ]);
    const tracks = new Map<string, Array<Omit<(typeof trackRows)[number], "eventId">>>();
    const actors = new Map<string, Array<Omit<(typeof actorRows)[number], "eventId">>>();
    for (const { eventId, ...track } of trackRows) {
      const items = tracks.get(eventId) ?? [];
      items.push(track);
      tracks.set(eventId, items);
    }
    for (const { eventId, ...actor } of actorRows) {
      const items = actors.get(eventId) ?? [];
      items.push(actor);
      actors.set(eventId, items);
    }
    return { tracks, actors };
  }

  async listJobs(limit = 30) {
    return this.db
      .selectFrom("jobs")
      .selectAll()
      .orderBy("started_at", "desc")
      .limit(limit)
      .execute();
  }

  async startJob(type: string, sourceId: string | null = null): Promise<string> {
    const id = randomUUID();
    await this.db
      .insertInto("jobs")
      .values({
        id,
        type,
        status: "running",
        source_id: sourceId,
        started_at: now(),
        finished_at: null,
        collected_count: 0,
        created_count: 0,
        skipped_count: 0,
        error_count: 0,
        error_summary: null,
        details_json: "{}",
      })
      .execute();
    return id;
  }

  async finishJob(
    id: string,
    result: { collected: number; created: number; skipped: number; errors: string[] },
  ): Promise<void> {
    await this.db
      .updateTable("jobs")
      .set({
        status: result.errors.length ? (result.created ? "partial" : "failed") : "succeeded",
        finished_at: now(),
        collected_count: result.collected,
        created_count: result.created,
        skipped_count: result.skipped,
        error_count: result.errors.length,
        error_summary: result.errors.slice(0, 5).join(" | ").slice(0, 4_000) || null,
        details_json: json({ errors: result.errors.slice(0, 20) }),
      })
      .where("id", "=", id)
      .execute();
  }
}

export function secureTokenEquals(expected: string, actual: string): boolean {
  const left = Buffer.from(expected);
  const right = Buffer.from(actual);
  return left.length === right.length && timingSafeEqual(left, right);
}

function isDiscoveryOnlySource(source: Pick<SourceRow, "role" | "source_category">): boolean {
  return source.role === "aggregator" || source.source_category === "aggregator";
}

function normalizeHandles(origin: OriginReference): Array<{ handle: string; role?: string }> {
  const values = [...(origin.handle ? [{ handle: origin.handle }] : []), ...(origin.handles ?? [])];
  const handles = new Map<string, { handle: string; role?: string }>();
  for (const value of values) {
    const handle = normalizeHandle(value.handle);
    if (!handle) continue;
    const previous = handles.get(handle);
    const role = value.role ?? previous?.role;
    handles.set(handle, role ? { handle, role } : { handle });
  }
  return [...handles.values()];
}

function normalizeHandle(value: string): string {
  return value
    .trim()
    .replace(/^@+/, "")
    .toLowerCase()
    .replace(/[^a-z0-9_.-]/g, "");
}

function normalizeIdentity(value: string): string {
  return value
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fff]/g, "");
}

function normalizeHost(value: string): string {
  return value.toLowerCase().replace(/^www\./, "");
}

function safeUrl(value: string): URL | null {
  try {
    return new URL(value);
  } catch {
    return null;
  }
}

function configuredIdentityHosts(source: SourceRow): string[] {
  const config = parseJson<{ identityHosts?: unknown }>(source.config_json, {});
  return Array.isArray(config.identityHosts)
    ? config.identityHosts
        .filter((value): value is string => typeof value === "string")
        .map(normalizeHost)
    : [];
}

function sourceHandles(source: SourceRow): string[] {
  const config = parseJson<{ socialHandles?: unknown }>(source.config_json, {});
  const configured = Array.isArray(config.socialHandles)
    ? config.socialHandles.filter((value): value is string => typeof value === "string")
    : [];
  const homepage = safeUrl(source.homepage_url);
  const socialHandle =
    homepage && ["x.com", "twitter.com", "weibo.com"].includes(normalizeHost(homepage.hostname))
      ? homepage.pathname.split("/").filter(Boolean)[0]
      : undefined;
  return [...new Set([source.slug, normalizeIdentity(source.name), socialHandle, ...configured])]
    .filter((value): value is string => Boolean(value))
    .map(normalizeHandle)
    .filter(Boolean);
}

function discoveryMatchesSignal(discovery: SourceDiscoveryRow, signal: SignalRow): boolean {
  const publishedDelta = Math.abs(
    new Date(discovery.published_at).getTime() - new Date(signal.published_at).getTime(),
  );
  if (!Number.isFinite(publishedDelta) || publishedDelta > 7 * 86_400_000) return false;
  const similarity = titleSimilarity(discovery.title, signal.title);
  if (similarity >= 0.42) return true;
  const left = normalizeIdentity(discovery.title);
  const right = normalizeIdentity(signal.title);
  return left.length >= 8 && right.length >= 8 && (left.includes(right) || right.includes(left));
}

function mergeDiscoveryMetrics(
  base: Record<string, unknown>,
  discoveries: SourceDiscoveryRow[],
): Record<string, unknown> {
  const result = { ...base };
  const numericKeys = ["likes", "comments", "reposts", "tweets", "authors"];
  for (const key of numericKeys) {
    const values = discoveries
      .map((discovery) => parseJson<Record<string, unknown>>(discovery.metrics_json, {})[key])
      .filter((value): value is number => typeof value === "number" && Number.isFinite(value));
    const baseValue = typeof result[key] === "number" ? result[key] : 0;
    if (values.length) result[key] = Math.max(baseValue as number, ...values);
  }
  for (const key of ["platforms", "regions"] as const) {
    const values = discoveries.flatMap((discovery) => {
      const value = parseJson<Record<string, unknown>>(discovery.metrics_json, {})[key];
      return Array.isArray(value)
        ? value.filter((item): item is string => typeof item === "string")
        : [];
    });
    const baseValues = Array.isArray(result[key])
      ? result[key].filter((item): item is string => typeof item === "string")
      : [];
    result[key] = [...new Set([...baseValues, ...values])];
  }
  result.aggregatorHeat = {
    discoveryCount: discoveries.length,
    aggregatorSourceCount: new Set(discoveries.map((discovery) => discovery.aggregator_source_id))
      .size,
    latestSeenAt: discoveries.reduce(
      (latest, discovery) => (discovery.last_seen_at > latest ? discovery.last_seen_at : latest),
      "",
    ),
  };
  return result;
}

function discoveryIdentity(
  originUrl: string | null,
  handles: Array<{ handle: string }>,
  discoveryUrl: string,
): string {
  if (originUrl) {
    const origin = safeUrl(originUrl);
    if (origin && SHARED_IDENTITY_HOSTS.has(normalizeHost(origin.hostname)) && handles.length) {
      return handles.map((item) => `@${item.handle}`).join(", ");
    }
    return origin?.hostname ?? originUrl;
  }
  if (handles.length) return handles.map((item) => `@${item.handle}`).join(", ");
  return safeUrl(discoveryUrl)?.hostname ?? discoveryUrl;
}

export { json, now, parseJson };
