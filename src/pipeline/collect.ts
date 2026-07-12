import type { Kysely } from "kysely";
import { createDefaultCache, type ResponseCache } from "../collectors/cache.js";
import { createSafeFetcher, FetchError } from "../collectors/fetcher.js";
import { getAdapter } from "../collectors/index.js";
import { createDefaultRateLimiter, RateLimiter } from "../collectors/rate-limiter.js";
import type { FetchResult } from "../collectors/types.js";
import type { AppConfig } from "../config/env.js";
import { parseJson, Repository } from "../db/repository.js";
import type { DatabaseSchema, SourceRow } from "../db/types.js";
import {
  applySourceFailure,
  applySourceSuccess,
  type SourceLifecycle,
} from "../domain/source-lifecycle.js";
import type { CollectedSignal, SourceDescriptor } from "../domain/types.js";
import { scoreSignal } from "./quality.js";

export interface CollectionSummary {
  collected: number;
  created: number;
  skipped: number;
  errors: string[];
}

interface SourceResult extends CollectionSummary {
  sourceId: string;
}

export async function collectSources(
  db: Kysely<DatabaseSchema>,
  config: AppConfig,
  sourceId?: string,
): Promise<CollectionSummary> {
  const repository = new Repository(db);
  const rateLimiter = createDefaultRateLimiter();
  const cache = createDefaultCache();
  const sources = sourceId
    ? [await repository.getSourceByIdOrSlug(sourceId)].filter((source): source is SourceRow =>
        Boolean(source),
      )
    : await repository.getEnabledSources();
  if (sourceId && sources.length === 0) throw new Error(`Source not found: ${sourceId}`);
  if (sourceId && !["shadow", "active", "degraded"].includes(sources[0]?.lifecycle_status ?? ""))
    throw new Error(`Source cannot run while ${sources[0]?.lifecycle_status ?? "unknown"}`);
  const jobId = await repository.startJob("collect", sourceId ?? null);
  let result: CollectionSummary = { collected: 0, created: 0, skipped: 0, errors: [] };

  try {
    const sourceResults = await concurrentMap(
      sources,
      Math.min(config.COLLECTOR_CONCURRENCY, Math.max(1, sources.length)),
      (source) => collectOneSource(repository, config, source, jobId, rateLimiter, cache),
    );
    result = sourceResults.reduce<CollectionSummary>(
      (summary, current) => ({
        collected: summary.collected + current.collected,
        created: summary.created + current.created,
        skipped: summary.skipped + current.skipped,
        errors: [...summary.errors, ...current.errors],
      }),
      result,
    );
  } catch (error) {
    result.errors.push(`pipeline: ${message(error)}`);
  } finally {
    await repository.finishJob(jobId, result);
  }
  return result;
}

async function collectOneSource(
  repository: Repository,
  config: AppConfig,
  row: SourceRow,
  jobId: string,
  rateLimiter: RateLimiter,
  cache: ResponseCache,
): Promise<SourceResult> {
  const started = Date.now();
  const runId = await repository.startSourceRun(row.id, jobId);
  const result: SourceResult = {
    sourceId: row.id,
    collected: 0,
    created: 0,
    skipped: 0,
    errors: [],
  };
  const safeFetch = createSafeFetcher(config);
  const state = parseJson<Record<string, unknown>>(row.state_json, {});
  let attemptCount = 0;
  let responseBytes = 0;
  let httpStatus: number | null = null;
  let notModified = false;
  let etag = typeof state.etag === "string" ? state.etag : undefined;
  let lastModified = typeof state.lastModified === "string" ? state.lastModified : undefined;
  let lastRequestAt = 0;

  try {
    const source = repository.toSourceDescriptor(row);
    const items = await getAdapter(source.adapter).collect(source, {
      config,
      fetchText: async (url, headers = {}) => {
        const cached = cache.get(url);
        if (cached) {
          return {
            body: cached.body,
            status: cached.status,
            headers: new Headers({
              ...(cached.etag ? { etag: cached.etag } : {}),
              ...(cached.lastModified ? { "last-modified": cached.lastModified } : {}),
              "x-agent-pulse-cache": "hit",
            }),
            attemptCount: 0,
            responseBytes: cached.responseBytes,
            finalUrl: url,
          };
        }
        const minimumInterval = Math.ceil(60_000 / Math.max(1, row.rate_limit_per_minute));
        const waitFor = Math.max(0, lastRequestAt + minimumInterval - Date.now());
        if (waitFor > 0) await delay(waitFor);
        lastRequestAt = Date.now();
        const domain = RateLimiter.domainFromUrl(url);
        await rateLimiter.acquire(domain, row.rate_limit_per_minute);
        let fetched: FetchResult;
        try {
          fetched = await safeFetch(
            url,
            {
              ...(etag ? { "if-none-match": etag } : {}),
              ...(lastModified ? { "if-modified-since": lastModified } : {}),
              ...headers,
            },
            {
              timeoutMs: row.timeout_ms,
              maxRetries: row.max_retries,
              baseBackoffMs: row.base_backoff_ms,
            },
          );
          rateLimiter.reportSuccess(domain);
        } catch (error) {
          if (error instanceof FetchError && error.type === "rate_limit") {
            rateLimiter.reportRateLimited(domain);
          }
          throw error;
        } finally {
          rateLimiter.release(domain);
        }
        attemptCount += fetched.attemptCount;
        responseBytes += fetched.responseBytes;
        httpStatus = fetched.status;
        notModified ||= fetched.status === 304;
        etag = fetched.headers.get("etag") ?? etag;
        lastModified = fetched.headers.get("last-modified") ?? lastModified;
        if (fetched.status === 200) {
          cache.set(
            url,
            fetched.body,
            fetched.status,
            fetched.headers.get("etag"),
            fetched.headers.get("last-modified"),
            fetched.responseBytes,
          );
        }
        return fetched;
      },
    });
    result.collected = items.length;
    const discoveryOnly = isDiscoveryOnlySource(row);
    let qualityRejected = 0;
    for (const item of items) {
      const rejection = rejectSignal(item, source, discoveryOnly);
      if (rejection) {
        qualityRejected += 1;
        result.skipped += 1;
        continue;
      }
      const quality = scoreSignal(item, source);
      const normalizedItem: CollectedSignal = {
        ...normalizeCollectedSignal(item),
        rawMeta: {
          ...item.rawMeta,
          quality: {
            score: quality.total,
            grade: quality.grade,
            dimensions: quality.dimensions,
            flags: quality.flags,
          },
        },
      };
      if (discoveryOnly) {
        const discovery = await repository.saveSourceDiscovery(source.id, normalizedItem);
        if (discovery.created) result.created += 1;
        else result.skipped += 1;
      } else {
        const inserted = await repository.insertSignal(source.id, normalizedItem);
        if (inserted) result.created += 1;
        else result.skipped += 1;
      }
    }
    if (items.length > 0 && qualityRejected === items.length) {
      throw new Error("Collector contract drift: every item failed the signal quality gate");
    }
    const health = applySourceSuccess(healthState(row), notModified);
    const timestamp = new Date().toISOString();
    await repository.updateSource(source.id, {
      state_json: JSON.stringify({ ...state, etag, lastModified }),
      last_collected_at: timestamp,
      last_success_at: timestamp,
      last_verified_at: timestamp,
      last_error: null,
      lifecycle_status: health.lifecycle,
      health_score: health.healthScore,
      consecutive_failures: health.consecutiveFailures,
      success_count: health.successCount,
      enabled:
        health.lifecycle === "quarantined" || health.lifecycle === "retired" ? 0 : row.enabled,
      observation_enabled:
        health.lifecycle === "quarantined" || health.lifecycle === "retired"
          ? 0
          : row.observation_enabled,
    });
    await repository.finishSourceRun(runId, {
      status: notModified ? "not_modified" : "succeeded",
      attemptCount: Math.max(1, attemptCount),
      durationMs: Date.now() - started,
      collected: result.collected,
      created: result.created,
      skipped: result.skipped,
      httpStatus,
      responseBytes,
    });
  } catch (error) {
    const detail = `${row.slug}: ${message(error)}`;
    result.errors.push(detail);
    const errorType = error instanceof FetchError ? error.type : "contract";
    const health = applySourceFailure(
      healthState(row),
      errorType === "security" || errorType === "contract",
    );
    await repository.updateSource(row.id, {
      last_collected_at: new Date().toISOString(),
      last_error: detail.slice(0, 4_000),
      lifecycle_status: health.lifecycle,
      health_score: health.healthScore,
      consecutive_failures: health.consecutiveFailures,
      failure_count: health.failureCount,
      enabled: health.lifecycle === "quarantined" ? 0 : row.enabled,
      observation_enabled:
        row.lifecycle_status === "shadow" && health.lifecycle !== "shadow"
          ? 0
          : health.lifecycle === "quarantined"
            ? 0
            : row.observation_enabled,
    });
    await repository.finishSourceRun(runId, {
      status: "failed",
      attemptCount: error instanceof FetchError ? error.attemptCount : Math.max(1, attemptCount),
      durationMs: Date.now() - started,
      collected: result.collected,
      created: result.created,
      skipped: result.skipped,
      httpStatus: error instanceof FetchError ? error.status : httpStatus,
      responseBytes,
      errorType,
      errorCode: error instanceof FetchError ? error.code : "CONTRACT_ERROR",
      errorSummary: detail,
    });
  }
  return result;
}

export function rejectSignal(
  item: CollectedSignal,
  source: Pick<SourceDescriptor, "tier" | "role" | "authorityScore" | "region">,
  discoveryOnly = false,
): string | null {
  if (!item.title?.trim()) return "missing_title";
  try {
    const url = new URL(item.url);
    if (url.protocol !== "http:" && url.protocol !== "https:") return "invalid_url";
  } catch {
    return "invalid_url";
  }
  if (!Number.isFinite(new Date(item.publishedAt).getTime())) return "invalid_date";
  if (item.rawMeta.dateInferred === true) return "inferred_date";
  const normalized = `${item.title}\n${item.summary}`.normalize("NFKC").toLowerCase();
  if (
    /sina visitor system|验证码|captcha|access denied|just a moment|enable javascript|请完成安全验证/.test(
      normalized,
    )
  ) {
    return "block_page";
  }
  if (discoveryOnly) return null;
  const quality = scoreSignal(item, source);
  return quality.grade === "F" ? "quality_f" : null;
}

export function normalizeCollectedSignal(item: CollectedSignal): CollectedSignal {
  return {
    ...item,
    title: compactText(item.title, 500),
    summary: compactText(item.summary, 2_000),
    ...(item.author ? { author: compactText(item.author, 200) } : {}),
    tags: [...new Set(item.tags.map((tag) => compactText(tag, 80)).filter(Boolean))].slice(0, 30),
  };
}

function compactText(value: string, limit: number): string {
  const normalized = value
    .normalize("NFKC")
    // biome-ignore lint/suspicious/noControlCharactersInRegex: collector text must remove non-printing source bytes before persistence
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (normalized.length <= limit) return normalized;
  return `${normalized.slice(0, limit - 1).trimEnd()}…`;
}

function healthState(row: SourceRow) {
  return {
    lifecycle: row.lifecycle_status as SourceLifecycle,
    healthScore: row.health_score,
    consecutiveFailures: row.consecutive_failures,
    successCount: row.success_count,
    failureCount: row.failure_count,
  };
}

export function isDiscoveryOnlySource(
  source: Pick<SourceRow, "role" | "source_category">,
): boolean {
  return source.role === "aggregator" || source.source_category === "aggregator";
}

export async function concurrentMap<T, R>(
  values: T[],
  concurrency: number,
  worker: (value: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(values.length);
  let next = 0;
  const runners = Array.from(
    { length: Math.min(Math.max(1, concurrency), values.length) },
    async () => {
      while (true) {
        const index = next;
        next += 1;
        if (index >= values.length) return;
        results[index] = await worker(values[index] as T, index);
      }
    },
  );
  await Promise.all(runners);
  return results;
}

function message(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}
