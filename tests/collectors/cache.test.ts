import { beforeEach, describe, expect, it } from "vitest";
import { ResponseCache } from "../../src/collectors/cache.js";

function makeCache(
  overrides?: Partial<{
    maxEntries: number;
    ttlMs: number;
    minBodySize: number;
    maxBodySize: number;
  }>,
) {
  return new ResponseCache({
    maxEntries: overrides?.maxEntries ?? 10,
    ttlMs: overrides?.ttlMs ?? 60_000,
    minBodySize: overrides?.minBodySize ?? 10,
    maxBodySize: overrides?.maxBodySize ?? 1024 * 1024,
  });
}

describe("ResponseCache", () => {
  let cache: ResponseCache;
  beforeEach(() => {
    cache = makeCache();
  });

  it("returns null on cache miss", () => {
    expect(cache.get("https://example.com/feed")).toBeNull();
  });

  it("stores and retrieves entries", () => {
    cache.set("https://example.com/feed", "<xml>content</xml>", 200);
    const entry = cache.get("https://example.com/feed");
    expect(entry).not.toBeNull();
    expect(entry?.body).toBe("<xml>content</xml>");
    expect(entry?.status).toBe(200);
  });

  it("respects TTL", async () => {
    const shortCache = makeCache({ ttlMs: 50, minBodySize: 1 });
    shortCache.set("https://example.com/feed", "some cached data", 200);
    expect(shortCache.get("https://example.com/feed")).not.toBeNull();

    await new Promise((r) => setTimeout(r, 60));
    expect(shortCache.get("https://example.com/feed")).toBeNull();
  });

  it("skips tiny responses", () => {
    cache.set("https://example.com/feed", "tiny", 200);
    expect(cache.get("https://example.com/feed")).toBeNull();
  });

  it("evicts oldest entry at capacity", () => {
    const small = makeCache({ maxEntries: 3 });
    small.set("https://a.com", "content-a-long-enough", 200);
    small.set("https://b.com", "content-b-long-enough", 200);
    small.set("https://c.com", "content-c-long-enough", 200);
    small.set("https://d.com", "content-d-long-enough", 200);

    expect(small.size).toBe(3);
    expect(small.get("https://a.com")).toBeNull(); // Evicted as oldest
    expect(small.get("https://b.com")).not.toBeNull();
    expect(small.get("https://c.com")).not.toBeNull();
    expect(small.get("https://d.com")).not.toBeNull();
  });

  it("tracks cache stats correctly", () => {
    cache.set("https://a.com", "content-a-long-enough-for-cache", 200);
    cache.get("https://a.com"); // hit
    cache.get("https://a.com"); // hit
    cache.get("https://missing.com"); // miss

    const stats = cache.stats();
    expect(stats.hits).toBe(2);
    expect(stats.misses).toBe(1);
    expect(stats.entries).toBe(1);
    expect(stats.hitRate).toBe(67); // 2/3 = 67%
  });

  it("provides conditional headers", () => {
    cache.set(
      "https://example.com/feed",
      "content-long-enough-for-caching",
      200,
      '"abc123"',
      "Mon, 01 Jul 2026 10:00:00 GMT",
    );
    const headers = cache.getConditionalHeaders("https://example.com/feed");
    expect(headers["if-none-match"]).toBe('"abc123"');
    expect(headers["if-modified-since"]).toBe("Mon, 01 Jul 2026 10:00:00 GMT");
  });

  it("returns empty headers for uncached URL", () => {
    expect(cache.getConditionalHeaders("https://missing.com")).toEqual({});
  });

  it("updates conditional metadata", () => {
    cache.set(
      "https://example.com/feed",
      "content-long-enough-for-caching",
      200,
      '"old-etag"',
      null,
    );
    cache.updateConditional(
      "https://example.com/feed",
      '"new-etag"',
      "Wed, 02 Jul 2026 00:00:00 GMT",
    );
    const headers = cache.getConditionalHeaders("https://example.com/feed");
    expect(headers["if-none-match"]).toBe('"new-etag"');
    expect(headers["if-modified-since"]).toBe("Wed, 02 Jul 2026 00:00:00 GMT");
  });

  it("invalidates specific entries", () => {
    cache.set("https://a.com", "content-for-a-long-enough-key", 200);
    cache.set("https://b.com", "content-for-b-long-enough-key", 200);
    cache.invalidate("https://a.com");
    expect(cache.get("https://a.com")).toBeNull();
    expect(cache.get("https://b.com")).not.toBeNull();
  });

  it("clears all entries", () => {
    cache.set("https://a.com", "content-for-a-long-enough-key", 200);
    cache.set("https://b.com", "content-for-b-long-enough-key", 200);
    cache.invalidate();
    expect(cache.size).toBe(0);
    expect(cache.get("https://a.com")).toBeNull();
    expect(cache.get("https://b.com")).toBeNull();
  });

  it("lists cached keys", () => {
    cache.set("https://a.com", "content-for-a-long-enough-key", 200);
    cache.set("https://b.com", "content-for-b-long-enough-key", 200);
    const keys = cache.keys();
    expect(keys).toContain("https://a.com");
    expect(keys).toContain("https://b.com");
  });
});
