/**
 * Source proposal discovery.
 *
 * Discovery is deliberately read-only. It turns first-party origin hints into
 * scored proposals; a separate, explicit save call can only create disabled
 * draft sources. Aggregator pages are provenance, never source identities.
 */

import { randomUUID } from "node:crypto";
import { isIP } from "node:net";
import type { Kysely } from "kysely";
import type { DatabaseSchema } from "../db/types.js";
import type { OriginKind, OriginReference } from "../domain/types.js";
import { rootDomain } from "./utils.js";

export type CandidateConfidence = "high" | "medium" | "low";

export interface DiscoveredCandidate {
  slug: string;
  name: string;
  homepageUrl: string;
  region: string;
  language: string;
  suggestedTier: number;
  discoveryReason: string;
  /** First-party URLs only. Aggregator story URLs are intentionally excluded. */
  evidenceUrls: string[];
  /** Number of independent discovery observations after exact-row deduplication. */
  signalCount: number;
  /** Number of unique first-party URLs supporting this proposal. */
  uniqueEvidenceCount?: number;
  /** Number of aggregators that independently surfaced the candidate. */
  aggregatorCount?: number;
  /** Titles attached to the original links, useful during human review. */
  originalTitles?: string[];
  score?: number;
  confidence?: CandidateConfidence;
  origins: OriginReference[];
}

export interface DiscoveryReport {
  candidates: DiscoveredCandidate[];
  existingSourceMatches: number;
  newCandidates: number;
  skippedExisting: number;
  policyRejected: number;
  duplicateEvidence: number;
}

interface EvidenceObservation {
  id: string;
  url: string;
  host: string;
  root: string;
  kind: OriginKind;
  name?: string;
  title?: string;
  language: string;
  region: string;
  publishedAt: string;
  aggregatorId?: string;
}

interface DomainGroup {
  observations: EvidenceObservation[];
  urls: Map<string, EvidenceObservation>;
  hosts: Map<string, number>;
  names: Map<string, number>;
  aggregatorIds: Set<string>;
  titles: Set<string>;
  kinds: Set<OriginKind>;
}

const ORIGIN_KINDS = new Set<OriginKind>([
  "official",
  "paper",
  "github",
  "expert",
  "media",
  "social",
  "aggregator_story",
  "unknown",
]);

const SHARED_IDENTITY_HOSTS = [
  "github.com",
  "github.io",
  "twitter.com",
  "x.com",
  "youtube.com",
  "youtu.be",
  "medium.com",
  "linkedin.com",
  "reddit.com",
  "bilibili.com",
  "weibo.com",
  "zhihu.com",
  "arxiv.org",
  "substack.com",
  "beehiiv.com",
  "wordpress.com",
  "notion.site",
  "linktr.ee",
  "t.co",
  "news.ycombinator.com",
  "mp.weixin.qq.com",
];

/**
 * Build scored source proposals from stored first-party discovery hints and
 * legacy direct-signal references. This function never mutates the database.
 */
export async function discoverNewSources(
  db: Kysely<DatabaseSchema>,
  options: {
    minSignals?: number;
    limit?: number;
  } = {},
): Promise<DiscoveryReport> {
  const minSignals = Math.max(1, options.minSignals ?? 2);
  const limit = Math.max(0, options.limit ?? 50);
  const existingSources = await db
    .selectFrom("sources")
    .select(["id", "slug", "name", "homepage_url", "config_json", "role", "source_category"])
    .execute();
  const catalog = buildCatalogIdentity(existingSources);
  const observations: EvidenceObservation[] = [];
  let policyRejected = 0;
  let existingSourceMatches = 0;

  const discoveryRows = await db
    .selectFrom("source_discoveries")
    .innerJoin("sources as aggregator", "aggregator.id", "source_discoveries.aggregator_source_id")
    .select([
      "source_discoveries.id",
      "source_discoveries.origin_url as origin_url",
      "source_discoveries.origin_kind as origin_kind",
      "source_discoveries.origin_name as origin_name",
      "source_discoveries.title",
      "source_discoveries.language",
      "source_discoveries.published_at",
      "source_discoveries.matched_source_id",
      "aggregator.id as aggregator_id",
      "aggregator.name as aggregator_name",
      "aggregator.region as aggregator_region",
    ])
    .where("source_discoveries.origin_url", "is not", null)
    .orderBy("source_discoveries.last_seen_at", "desc")
    .limit(2_000)
    .execute();

  for (const row of discoveryRows) {
    if (row.matched_source_id) {
      existingSourceMatches++;
      continue;
    }
    const parsed = parseCandidateUrl(row.origin_url ?? "");
    if (!parsed || isSharedHost(parsed.host) || catalog.aggregatorRoots.has(parsed.root)) {
      policyRejected++;
      continue;
    }
    if (catalog.knownHosts.has(parsed.host) || catalog.knownRoots.has(parsed.root)) {
      existingSourceMatches++;
      continue;
    }
    const kind = normalizeOriginKind(row.origin_kind);
    if (kind === "social" || kind === "aggregator_story") {
      policyRejected++;
      continue;
    }
    const name = cleanCandidateName(row.origin_name, row.aggregator_name);
    const title = cleanTitle(row.title);
    observations.push({
      id: `discovery:${row.id}`,
      url: parsed.url,
      host: parsed.host,
      root: parsed.root,
      kind,
      ...(name ? { name } : {}),
      ...(title ? { title } : {}),
      language: normalizeLanguage(row.language),
      region: inferRegion(parsed.host, row.language, row.aggregator_region),
      publishedAt: row.published_at,
      aggregatorId: row.aggregator_id,
    });
  }

  // Preserve direct-source references collected before source_discoveries was
  // introduced. Aggregator-owned URLs are still rejected by the same policy.
  const signalRows = await db
    .selectFrom("signals")
    .innerJoin("sources", "sources.id", "signals.source_id")
    .select([
      "signals.id",
      "signals.canonical_url",
      "signals.raw_meta_json",
      "signals.language",
      "signals.published_at",
      "sources.region as source_region",
    ])
    .where("sources.source_category", "!=", "aggregator")
    .where("sources.role", "!=", "aggregator")
    .orderBy("signals.published_at", "desc")
    .limit(1_000)
    .execute();

  for (const signal of signalRows) {
    const meta = parseJson<Record<string, unknown>>(signal.raw_meta_json, {});
    for (const rawUrl of extractFirstPartyUrls(meta)) {
      const parsed = parseCandidateUrl(rawUrl);
      if (!parsed || isSharedHost(parsed.host) || catalog.aggregatorRoots.has(parsed.root)) {
        policyRejected++;
        continue;
      }
      if (catalog.knownHosts.has(parsed.host) || catalog.knownRoots.has(parsed.root)) {
        existingSourceMatches++;
        continue;
      }
      observations.push({
        id: `signal:${signal.id}:${parsed.url}`,
        url: parsed.url,
        host: parsed.host,
        root: parsed.root,
        kind: "unknown",
        language: normalizeLanguage(signal.language),
        region: inferRegion(parsed.host, signal.language, signal.source_region),
        publishedAt: signal.published_at,
      });
    }
  }

  const groups = groupObservations(observations);
  const duplicateEvidence =
    observations.length - [...groups.values()].reduce((sum, item) => sum + item.urls.size, 0);
  const candidates: DiscoveredCandidate[] = [];
  let belowThreshold = 0;

  for (const [root, group] of groups) {
    if (group.observations.length < minSignals) {
      belowThreshold++;
      continue;
    }
    const slug = domainToSlug(root);
    if (!slug || catalog.knownSlugs.has(slug)) {
      existingSourceMatches++;
      continue;
    }
    const score = scoreCandidate(group);
    const host = mostFrequent(group.hosts) ?? root;
    const name = mostFrequent(group.names) ?? displayName(root);
    const signalCount = group.observations.length;
    const uniqueEvidenceCount = group.urls.size;
    const aggregatorCount = group.aggregatorIds.size;
    const evidence = [...group.urls.entries()].sort(([left], [right]) => left.localeCompare(right));
    candidates.push({
      slug,
      name,
      homepageUrl: `https://${host}`,
      region: majority(
        group.observations.map((item) => item.region),
        "GLOBAL",
      ),
      language: majority(
        group.observations.map((item) => item.language),
        "en",
      ),
      suggestedTier: score >= 80 ? 2 : score >= 58 ? 3 : 4,
      discoveryReason: discoveryReason(
        signalCount,
        uniqueEvidenceCount,
        aggregatorCount,
        group.kinds,
      ),
      evidenceUrls: evidence.map(([url]) => url).slice(0, 10),
      signalCount,
      uniqueEvidenceCount,
      aggregatorCount,
      originalTitles: [...group.titles]
        .sort((left, right) => left.localeCompare(right))
        .slice(0, 10),
      score,
      confidence: score >= 75 ? "high" : score >= 50 ? "medium" : "low",
      origins: evidence.slice(0, 10).map(([, item]) => ({
        url: item.url,
        // Do not leak the aggregator story URL into a source proposal.
        discoveryUrl: item.url,
        ...(item.name ? { name: item.name } : {}),
        kind: item.kind,
      })),
    });
  }

  candidates.sort(
    (left, right) =>
      (right.score ?? 0) - (left.score ?? 0) ||
      (right.aggregatorCount ?? 0) - (left.aggregatorCount ?? 0) ||
      right.signalCount - left.signalCount ||
      left.slug.localeCompare(right.slug),
  );

  return {
    candidates: candidates.slice(0, limit),
    existingSourceMatches,
    newCandidates: candidates.length,
    skippedExisting: belowThreshold,
    policyRejected,
    duplicateEvidence,
  };
}

/**
 * Explicitly persist reviewed proposals. Saving never activates a source: all
 * new rows are disabled drafts that still require compliance and shadow checks.
 */
export async function saveDiscoveredSources(
  db: Kysely<DatabaseSchema>,
  candidates: DiscoveredCandidate[],
): Promise<{ created: number; skipped: number }> {
  let created = 0;
  let skipped = 0;
  const timestamp = new Date().toISOString();
  const existingSources = await db
    .selectFrom("sources")
    .select(["slug", "homepage_url", "config_json", "role", "source_category"])
    .execute();
  const catalog = buildCatalogIdentity(existingSources);

  for (const candidate of candidates) {
    const parsed = parseCandidateUrl(candidate.homepageUrl);
    const slug = normalizeSlug(candidate.slug);
    if (
      !parsed ||
      !slug ||
      isSharedHost(parsed.host) ||
      catalog.aggregatorRoots.has(parsed.root) ||
      catalog.knownHosts.has(parsed.host) ||
      catalog.knownRoots.has(parsed.root) ||
      catalog.knownSlugs.has(slug)
    ) {
      skipped++;
      continue;
    }

    const id = randomUUID();
    const proposalScore = candidate.score ?? 0;
    const proposalConfidence = candidate.confidence ?? "low";
    const sourceCategory = categoryFor(candidate.origins.map((origin) => origin.kind));
    await db
      .insertInto("sources")
      .values({
        id,
        slug,
        name: cleanCandidateName(candidate.name) ?? displayName(parsed.root),
        homepage_url: parsed.url,
        adapter: "web-scraper",
        tier: Math.min(4, Math.max(2, candidate.suggestedTier)),
        role:
          sourceCategory === "media" || sourceCategory === "expert" ? sourceCategory : "primary",
        region: candidate.region,
        language: candidate.language,
        authority_score: proposalScore >= 80 ? 70 : proposalScore >= 58 ? 55 : 40,
        enabled: 0,
        config_json: JSON.stringify({ url: parsed.url, category: "industry", take: 20 }),
        state_json: JSON.stringify({
          proposal: true,
          proposalScore,
          proposalConfidence,
          discoveryReason: candidate.discoveryReason,
          evidenceUrls: candidate.evidenceUrls.slice(0, 10),
        }),
        lifecycle_status: "draft",
        source_category: sourceCategory,
        acquisition: "html",
        topics_json: "[]",
        maintenance_status: "proposal",
        cadence: "24h",
        license_note:
          "Proposal only; verify ownership, robots, terms, and attribution before shadow collection.",
        quality_score: Math.min(70, Math.max(30, proposalScore)),
        last_verified_at: null,
        created_at: timestamp,
        updated_at: timestamp,
      })
      .execute();

    catalog.knownSlugs.add(slug);
    catalog.knownHosts.add(parsed.host);
    catalog.knownRoots.add(parsed.root);
    created++;
  }

  return { created, skipped };
}

function buildCatalogIdentity(
  sources: Array<{
    slug: string;
    homepage_url: string;
    config_json: string;
    role: string;
    source_category: string;
  }>,
) {
  const knownHosts = new Set<string>();
  const knownRoots = new Set<string>();
  const knownSlugs = new Set<string>();
  const aggregatorRoots = new Set<string>();
  for (const source of sources) {
    knownSlugs.add(source.slug.toLowerCase());
    const identityUrls = [source.homepage_url];
    const config = parseJson<{ identityHosts?: unknown[] }>(source.config_json, {});
    for (const value of config.identityHosts ?? []) {
      if (typeof value === "string")
        identityUrls.push(value.includes("://") ? value : `https://${value}`);
    }
    for (const value of identityUrls) {
      const parsed = parseCandidateUrl(value, false);
      if (!parsed) continue;
      knownHosts.add(parsed.host);
      knownRoots.add(parsed.root);
      if (source.role === "aggregator" || source.source_category === "aggregator") {
        aggregatorRoots.add(parsed.root);
      }
    }
  }
  return { knownHosts, knownRoots, knownSlugs, aggregatorRoots };
}

function groupObservations(observations: EvidenceObservation[]): Map<string, DomainGroup> {
  const groups = new Map<string, DomainGroup>();
  const observationIds = new Set<string>();
  for (const observation of observations) {
    if (observationIds.has(observation.id)) continue;
    observationIds.add(observation.id);
    const group: DomainGroup = groups.get(observation.root) ?? {
      observations: [],
      urls: new Map(),
      hosts: new Map(),
      names: new Map(),
      aggregatorIds: new Set(),
      titles: new Set(),
      kinds: new Set(),
    };
    group.observations.push(observation);
    if (!group.urls.has(observation.url)) group.urls.set(observation.url, observation);
    increment(group.hosts, observation.host);
    if (observation.name) increment(group.names, observation.name);
    if (observation.aggregatorId) group.aggregatorIds.add(observation.aggregatorId);
    if (observation.title) group.titles.add(observation.title);
    group.kinds.add(observation.kind);
    groups.set(observation.root, group);
  }
  return groups;
}

function scoreCandidate(group: DomainGroup): number {
  const observationScore = Math.min(30, group.observations.length * 7);
  const evidenceScore = Math.min(15, group.urls.size * 5);
  const aggregatorScore = Math.min(20, group.aggregatorIds.size * 10);
  const titleScore = Math.min(10, group.titles.size * 2);
  const kindScore = group.kinds.has("official")
    ? 20
    : group.kinds.has("paper") || group.kinds.has("github")
      ? 18
      : group.kinds.has("expert")
        ? 12
        : group.kinds.has("media")
          ? 8
          : 2;
  const newest = Math.max(
    ...group.observations.map((item) => Date.parse(item.publishedAt)).filter(Number.isFinite),
    0,
  );
  const ageDays = newest ? (Date.now() - newest) / 86_400_000 : Number.POSITIVE_INFINITY;
  const recencyScore = ageDays <= 7 ? 5 : ageDays <= 30 ? 3 : ageDays <= 180 ? 1 : 0;
  const singleWeakPenalty = group.observations.length === 1 && kindScore <= 8 ? 10 : 0;
  return Math.max(
    0,
    Math.min(
      100,
      observationScore +
        evidenceScore +
        aggregatorScore +
        titleScore +
        kindScore +
        recencyScore -
        singleWeakPenalty,
    ),
  );
}

function parseCandidateUrl(
  raw: string,
  enforcePolicy = true,
): { url: string; host: string; root: string } | null {
  try {
    const url = new URL(raw.trim());
    if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) return null;
    const host = url.hostname
      .toLowerCase()
      .replace(/^www\./, "")
      .replace(/^\[|\]$/g, "");
    if (!host || host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local"))
      return null;
    if (enforcePolicy && isIP(host)) return null;
    url.hostname = host;
    url.hash = "";
    for (const key of [...url.searchParams.keys()]) {
      if (/^(utm_|fbclid$|gclid$|ref$)/i.test(key)) url.searchParams.delete(key);
    }
    url.searchParams.sort();
    return { url: url.toString().replace(/\/$/, ""), host, root: rootDomain(host) };
  } catch {
    return null;
  }
}

function extractFirstPartyUrls(meta: Record<string, unknown>): string[] {
  const urls: string[] = [];
  if (typeof meta.originUrl === "string") urls.push(meta.originUrl);
  if (Array.isArray(meta.referencedUrls)) {
    for (const value of meta.referencedUrls) if (typeof value === "string") urls.push(value);
  }
  return [...new Set(urls)];
}

function normalizeOriginKind(value: string): OriginKind {
  return ORIGIN_KINDS.has(value as OriginKind) ? (value as OriginKind) : "unknown";
}

function cleanCandidateName(value?: string | null, aggregatorName?: string): string | undefined {
  const cleaned = value?.replace(/\s+/g, " ").trim().slice(0, 120);
  if (!cleaned || /^https?:\/\//i.test(cleaned)) return undefined;
  if (aggregatorName && normalizeIdentity(cleaned) === normalizeIdentity(aggregatorName))
    return undefined;
  return cleaned;
}

function cleanTitle(value: string): string | undefined {
  const cleaned = value.replace(/\s+/g, " ").trim().slice(0, 240);
  return cleaned || undefined;
}

function normalizeIdentity(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9\p{L}]+/gu, "");
}

function normalizeLanguage(value: string): string {
  return value.toLowerCase().startsWith("zh") ? "zh-CN" : value || "en";
}

function inferRegion(host: string, language: string, fallback: string): string {
  if (host.endsWith(".cn") || language.toLowerCase().startsWith("zh")) return "CN";
  return fallback === "CN" ? "CN" : "GLOBAL";
}

function isSharedHost(host: string): boolean {
  return SHARED_IDENTITY_HOSTS.some((shared) => host === shared || host.endsWith(`.${shared}`));
}

function domainToSlug(domain: string): string {
  return normalizeSlug(domain.replace(/\.(com|org|net|io|ai|cn|co|dev|app)$/, ""));
}

function normalizeSlug(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/--+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 50);
}

function displayName(domain: string): string {
  const stem = domain.split(".")[0] ?? domain;
  return (
    stem
      .split(/[-_]/)
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ") || domain
  );
}

function categoryFor(kinds: OriginKind[]): string {
  if (kinds.includes("official")) return "company";
  if (kinds.includes("paper")) return "research";
  if (kinds.includes("github")) return "open-source";
  if (kinds.includes("expert")) return "expert";
  return "media";
}

function discoveryReason(
  observations: number,
  urls: number,
  aggregators: number,
  kinds: Set<OriginKind>,
): string {
  const firstParty = [...kinds].filter((kind) => kind !== "unknown").join("、") || "待确认";
  return `${observations} 次发现，${urls} 个原始链接，${aggregators} 个独立聚合源；来源角色：${firstParty}`;
}

function increment(map: Map<string, number>, key: string): void {
  map.set(key, (map.get(key) ?? 0) + 1);
}

function mostFrequent(map: Map<string, number>): string | undefined {
  return [...map.entries()].sort(
    (left, right) => right[1] - left[1] || left[0].localeCompare(right[0]),
  )[0]?.[0];
}

function majority(values: string[], fallback: string): string {
  const counts = new Map<string, number>();
  for (const value of values.filter(Boolean)) increment(counts, value);
  return mostFrequent(counts) ?? fallback;
}

function parseJson<T>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}
