/**
 * HTTP response cache for collector requests.
 *
 * Implements:
 *   - ETag / Last-Modified based conditional requests
 *   - Memory cache with TTL and max size
 *   - Cache hit/miss tracking
 *   - Automatic eviction of stale entries
 *
 * The cache is designed to work alongside the SQLite-based state persistence
 * in the Repository layer. This module provides an in-memory acceleration layer
 * for frequently accessed feeds during a single collection run.
 */

export interface CacheEntry {
  url: string;
  body: string;
  status: number;
  etag: string | null;
  lastModified: string | null;
  responseBytes: number;
  cachedAt: number;
  hits: number;
}

export interface CacheConfig {
  /** Maximum number of entries in memory */
  maxEntries: number;
  /** Time-to-live in milliseconds */
  ttlMs: number;
  /** Minimum body size to cache (skip empty/tiny responses) */
  minBodySize: number;
  /** Maximum body size to cache (skip huge responses) */
  maxBodySize: number;
}

export interface CacheStats {
  hits: number;
  misses: number;
  entries: number;
  evictions: number;
  hitRate: number;
  totalBytesCached: number;
}

export class ResponseCache {
  private cache = new Map<string, CacheEntry>();
  private totalHits = 0;
  private totalMisses = 0;
  private totalEvictions = 0;

  constructor(private config: CacheConfig) {}

  /**
   * Get a cached response if available and fresh.
   * Returns the entry or null on miss.
   */
  get(url: string): CacheEntry | null {
    const entry = this.cache.get(url);
    if (!entry) {
      this.totalMisses++;
      return null;
    }

    // Check TTL
    if (Date.now() - entry.cachedAt > this.config.ttlMs) {
      this.cache.delete(url);
      this.totalEvictions++;
      this.totalMisses++;
      return null;
    }

    entry.hits++;
    this.totalHits++;
    return entry;
  }

  /**
   * Store a response in the cache.
   */
  set(
    url: string,
    body: string,
    status: number,
    etag: string | null = null,
    lastModified: string | null = null,
    responseBytes?: number,
  ): void {
    // Skip tiny responses (usually errors)
    if (body.length < this.config.minBodySize) return;
    // Skip huge responses
    if (body.length > this.config.maxBodySize) return;

    // Evict if at capacity (LRU-like: remove oldest entry)
    while (this.cache.size >= this.config.maxEntries) {
      const oldest = this.findOldest();
      if (oldest) {
        this.cache.delete(oldest);
        this.totalEvictions++;
      } else {
        break;
      }
    }

    this.cache.set(url, {
      url,
      body,
      status,
      etag,
      lastModified,
      responseBytes: responseBytes ?? body.length,
      cachedAt: Date.now(),
      hits: 0,
    });
  }

  /**
   * Build conditional request headers from a cached entry.
   */
  getConditionalHeaders(url: string): Record<string, string> {
    const entry = this.cache.get(url);
    if (!entry) return {};
    const headers: Record<string, string> = {};
    if (entry.etag) headers["if-none-match"] = entry.etag;
    if (entry.lastModified) headers["if-modified-since"] = entry.lastModified;
    return headers;
  }

  /**
   * Update ETag/Last-Modified from a 304 response.
   */
  updateConditional(url: string, etag: string | null, lastModified: string | null): void {
    const entry = this.cache.get(url);
    if (!entry) return;
    if (etag) entry.etag = etag;
    if (lastModified) entry.lastModified = lastModified;
  }

  /**
   * Get cache statistics.
   */
  stats(): CacheStats {
    const total = this.totalHits + this.totalMisses;
    let totalBytesCached = 0;
    for (const entry of this.cache.values()) {
      totalBytesCached += entry.responseBytes;
    }
    return {
      hits: this.totalHits,
      misses: this.totalMisses,
      entries: this.cache.size,
      evictions: this.totalEvictions,
      hitRate: total > 0 ? Math.round((this.totalHits / total) * 100) : 0,
      totalBytesCached,
    };
  }

  /**
   * Invalidate a specific URL or clear all entries.
   */
  invalidate(url?: string): void {
    if (url) {
      this.cache.delete(url);
    } else {
      this.cache.clear();
    }
  }

  /**
   * Get keys of all cached URLs.
   */
  keys(): string[] {
    return [...this.cache.keys()];
  }

  /**
   * Number of entries currently cached.
   */
  get size(): number {
    return this.cache.size;
  }

  private findOldest(): string | null {
    let oldestUrl: string | null = null;
    let oldestTime = Infinity;
    for (const [url, entry] of this.cache) {
      if (entry.cachedAt < oldestTime) {
        oldestTime = entry.cachedAt;
        oldestUrl = url;
      }
    }
    return oldestUrl;
  }
}

/**
 * Create a default response cache.
 */
export function createDefaultCache(): ResponseCache {
  return new ResponseCache({
    maxEntries: 500,
    ttlMs: 15 * 60_000, // 15 minutes
    minBodySize: 50, // Don't cache empty/error responses
    maxBodySize: 2 * 1024 * 1024, // 2 MB max per entry
  });
}
