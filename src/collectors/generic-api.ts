/**
 * Generic API adapter for sources that expose JSON API endpoints.
 *
 * Unlike the aiHot adapter (which is specialized for the AI Hot aggregator),
 * this adapter handles arbitrary JSON API responses with configurable
 * JSONPath-like field mappings.
 *
 * Supports:
 *   - Flat array responses
 *   - Paginated responses with configurable data path
 *   - Custom field mapping via source config
 */

import type { CollectedSignal } from "../domain/types.js";
import type { SourceAdapter } from "./types.js";

export const genericApiAdapter: SourceAdapter = {
  kind: "generic-api",
  async collect(source, context) {
    const { body, status } = await context.fetchText(source.config.url);
    if (status === 304) return [];

    let payload: unknown;
    try {
      payload = JSON.parse(body);
    } catch {
      throw new Error("Generic API: failed to parse JSON response");
    }

    // Extract items array from payload
    const items = extractItems(payload, source.config as Record<string, unknown>);
    if (!Array.isArray(items) || items.length === 0) {
      throw new Error("Generic API: no items found in response");
    }

    const take = source.config.take ?? 30;
    return items
      .slice(0, take)
      .map((item, index) =>
        normalizeApiItem(item, index, source.language, source.config.category, source.config.url),
      );
  },
};

/**
 * Navigate into the payload to find the items array.
 * Supports:
 *   - Direct array: [...]
 *   - Wrapped: { data: [...], items: [...], results: [...] }
 *   - Nested: { response: { docs: [...] } }
 *   - Configurable: source.config.dataPath = "response.docs"
 */
function extractItems(payload: unknown, config: Record<string, unknown>): unknown[] {
  if (Array.isArray(payload)) return payload;

  if (!isRecord(payload)) return [];

  // Configurable data path
  const dataPath = typeof config.dataPath === "string" ? config.dataPath : undefined;
  if (dataPath) {
    const parts = dataPath.split(".");
    let current: unknown = payload;
    for (const part of parts) {
      if (!isRecord(current)) return [];
      current = current[part];
    }
    return Array.isArray(current) ? current : [];
  }

  // Common wrapper keys
  const wrapperKeys = [
    "data",
    "items",
    "results",
    "records",
    "docs",
    "entries",
    "posts",
    "articles",
    "news",
  ];
  for (const key of wrapperKeys) {
    const value = payload[key];
    if (Array.isArray(value)) return value;
  }

  // Check nested objects
  for (const value of Object.values(payload)) {
    if (isRecord(value)) {
      for (const innerKey of wrapperKeys) {
        const inner = value[innerKey];
        if (Array.isArray(inner)) return inner;
      }
    }
  }

  return [];
}

function normalizeApiItem(
  item: unknown,
  index: number,
  language: string,
  fallbackCategory?: string,
  baseUrl?: string,
): CollectedSignal {
  if (!isRecord(item)) {
    throw new Error(`Generic API: invalid item at index ${index}`);
  }

  // Auto-detect fields by common names
  const title = findField(item, ["title", "name", "headline", "subject", "label"]);
  const url = findField(item, [
    "url",
    "link",
    "href",
    "permalink",
    "canonicalUrl",
    "canonical_url",
  ]);
  const summary = findField(item, [
    "summary",
    "description",
    "desc",
    "abstract",
    "excerpt",
    "content",
    "body",
    "text",
  ]);
  const publishedAt = findField(item, [
    "publishedAt",
    "published_at",
    "datePublished",
    "date_gmt",
    "date",
    "createdAt",
    "created_at",
    "timestamp",
    "pubDate",
    "pub_date",
  ]);
  const category = findField(item, ["category", "type", "section", "topic"]);
  const tags = findArrayField(item, ["tags", "keywords", "labels", "categories", "topics"]);
  const author = findField(item, ["author", "creator", "by", "writer", "publisher"]);
  const id = findField(item, ["id", "_id", "uuid", "guid", "slug", "key"]);

  if (!title) {
    throw new Error(`Generic API: could not find title field in item ${index}`);
  }

  const normalizedUrl = resolvePublicUrl(url, baseUrl);
  const date = normalizeDate(publishedAt);
  return {
    externalId: id || normalizedUrl || `generic-api-${index}`,
    url: normalizedUrl,
    title: stripHtml(String(title)),
    summary: stripHtml(String(summary || title)).slice(0, 8_000),
    ...(author ? { author: String(author) } : {}),
    language,
    publishedAt: date.value,
    category: category ? String(category) : (fallbackCategory ?? "industry"),
    tags: tags.filter((t): t is string => typeof t === "string"),
    metrics: { platforms: ["api"] },
    rawMeta: {
      adapter: "generic-api",
      dateInferred: date.inferred,
      sourceKeys: Object.keys(item).slice(0, 50),
    },
  };
}

/**
 * Find the first matching field in an object from a list of candidate keys.
 */
function findField(record: Record<string, unknown>, candidates: string[]): string | undefined {
  for (const key of candidates) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number") return String(value);
    if (isRecord(value) && typeof value.rendered === "string" && value.rendered.trim()) {
      return value.rendered.trim();
    }
  }
  return undefined;
}

function stripHtml(value: string): string {
  return value
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&#8217;|&#39;|&apos;/gi, "'")
    .replace(/&quot;/gi, '"')
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Find an array field by candidate key names.
 */
function findArrayField(record: Record<string, unknown>, candidates: string[]): string[] {
  for (const key of candidates) {
    const value = record[key];
    if (Array.isArray(value)) {
      return value.map((v) => (typeof v === "string" ? v : String(v)));
    }
    if (typeof value === "string") {
      // Comma-separated string
      return value
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
    }
  }
  return [];
}

function normalizeDate(value?: string): { value: string; inferred: boolean } {
  const normalized =
    value && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(value) ? `${value}Z` : value;
  const date = normalized ? new Date(normalized) : null;
  return !date || Number.isNaN(date.getTime())
    ? { value: new Date().toISOString(), inferred: true }
    : { value: date.toISOString(), inferred: false };
}

function resolvePublicUrl(value?: string, baseUrl?: string): string {
  if (!value) return "";
  try {
    const url = new URL(value, baseUrl);
    return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : "";
  } catch {
    return "";
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
