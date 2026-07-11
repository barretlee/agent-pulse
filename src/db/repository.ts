import { randomUUID, timingSafeEqual } from "node:crypto";
import type { Kysely } from "kysely";
import type { CollectedSignal, PublicEvent, SourceDescriptor } from "../domain/types.js";
import { canonicalizeUrl, sha256 } from "../domain/url.js";
import type {
  DatabaseSchema,
  EventRow,
  NewEventRow,
  NewSourceRow,
  SignalRow,
  SourceRow,
  SourceUpdate,
} from "./types.js";

const now = () => new Date().toISOString();
const json = (value: unknown) => JSON.stringify(value);
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

  async getEnabledSources(): Promise<SourceRow[]> {
    return this.db.selectFrom("sources").selectAll().where("enabled", "=", 1).execute();
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

  async updateSource(id: string, patch: SourceUpdate): Promise<void> {
    await this.db
      .updateTable("sources")
      .set({ ...patch, updated_at: now() })
      .where("id", "=", id)
      .execute();
  }

  toSourceDescriptor(source: SourceRow): SourceDescriptor {
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
      config: parseJson(source.config_json, { url: source.homepage_url }),
      state: parseJson(source.state_json, {}),
    };
  }

  async insertSignal(sourceId: string, item: CollectedSignal): Promise<SignalRow | undefined> {
    const canonicalUrl = canonicalizeUrl(item.url);
    const urlHash = sha256(canonicalUrl);
    const existing = await this.db
      .selectFrom("signals")
      .select("id")
      .where("url_hash", "=", urlHash)
      .executeTakeFirst();
    if (existing) return undefined;

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
    return this.db.selectFrom("signals").selectAll().where("id", "=", id).executeTakeFirst();
  }

  async listUnclusteredSignals(limit = 200): Promise<SignalRow[]> {
    return this.db
      .selectFrom("signals")
      .leftJoin("event_signals", "event_signals.signal_id", "signals.id")
      .selectAll("signals")
      .where("event_signals.signal_id", "is", null)
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
    return Promise.all(events.map((event) => this.toPublicEvent(event)));
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
    const [sources, signals, drafts, published, failedJobs] = await Promise.all([
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
    ]);
    return {
      sources: Number(sources.count),
      signals: Number(signals.count),
      drafts: Number(drafts.count),
      published: Number(published.count),
      failedJobs: Number(failedJobs.count),
    };
  }

  async eventScoringContext(eventId: string): Promise<
    Array<{
      authorityScore: number;
      tier: number;
      role: string;
      metrics: Record<string, unknown>;
      publishedAt: string;
    }>
  > {
    const rows = await this.db
      .selectFrom("event_signals")
      .innerJoin("signals", "signals.id", "event_signals.signal_id")
      .innerJoin("sources", "sources.id", "signals.source_id")
      .select([
        "sources.authority_score as authorityScore",
        "sources.tier as tier",
        "sources.role as role",
        "signals.metrics_json as metricsJson",
        "signals.published_at as publishedAt",
      ])
      .where("event_signals.event_id", "=", eventId)
      .execute();
    return rows.map((row) => ({
      authorityScore: row.authorityScore,
      tier: row.tier,
      role: row.role,
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

export { json, now, parseJson };
