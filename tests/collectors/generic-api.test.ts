import { beforeAll, describe, expect, it } from "vitest";
import type { CollectContext, SourceAdapter } from "../../src/collectors/types.js";
import type { SourceDescriptor } from "../../src/domain/types.js";

let adapter: SourceAdapter;
beforeAll(async () => {
  const mod = await import("../../src/collectors/generic-api.js");
  adapter = mod.genericApiAdapter;
});

function makeContext(body: string, status = 200): CollectContext {
  return {
    config: {
      NODE_ENV: "test",
      HOST: "127.0.0.1",
      PORT: 8899,
      DATABASE_URL: "sqlite::memory:",
      COLLECTOR_USER_AGENT: "test",
      COLLECTOR_TIMEOUT_MS: 30000,
      COLLECTOR_CONCURRENCY: 4,
      COLLECTOR_PROXY_MODE: "off",
      PUBLIC_SITE_URL: "https://example.com",
      DEEPSEEK_BASE_URL: "https://api.deepseek.com",
      DEEPSEEK_MODEL: "deepseek-v4-flash",
      AI_ENRICHMENT_ENABLED: false,
      AI_ENRICHMENT_MAX_EVENTS: 8,
      AI_ENRICHMENT_TIMEOUT_MS: 60_000,
      AI_STAGE_PROMOTION_ENABLED: false,
      DEEPSEEK_STAGE_MODEL: "deepseek-v4-pro",
      AI_STAGE_PROMOTION_TIMEOUT_MS: 120_000,
      rootDir: "/tmp",
      databaseUrl: "sqlite::memory:",
      distDir: "/tmp/dist",
    },
    fetchText: async () => ({
      body,
      status,
      headers: new Headers(),
      attemptCount: 1,
      responseBytes: body.length,
      finalUrl: "https://api.example.com/items",
    }),
  };
}

function makeSource(overrides?: Partial<SourceDescriptor>): SourceDescriptor {
  return {
    id: "test",
    slug: "test-api",
    name: "Test API",
    homepageUrl: "https://api.example.com",
    adapter: "generic-api",
    tier: 2,
    role: "media",
    region: "GLOBAL",
    language: "en",
    authorityScore: 70,
    config: { url: "https://api.example.com/items", category: "tech", take: 10 },
    state: {},
    ...overrides,
  };
}

describe("generic-api adapter", () => {
  it("has kind generic-api", () => {
    expect(adapter.kind).toBe("generic-api");
  });

  it("returns empty for 304", async () => {
    const result = await adapter.collect(makeSource(), makeContext("", 304));
    expect(result).toEqual([]);
  });

  it("parses flat array response", async () => {
    const body = JSON.stringify([
      {
        id: "1",
        title: "Article 1",
        url: "https://example.com/1",
        summary: "Summary 1",
        publishedAt: "2026-07-01T00:00:00Z",
      },
      {
        id: "2",
        title: "Article 2",
        url: "https://example.com/2",
        summary: "Summary 2",
        publishedAt: "2026-07-02T00:00:00Z",
      },
    ]);
    const result = await adapter.collect(makeSource(), makeContext(body));
    expect(result).toHaveLength(2);
    expect(result[0]?.title).toBe("Article 1");
    expect(result[1]?.title).toBe("Article 2");
  });

  it("normalizes first-party WordPress API rendered fields", async () => {
    const body = JSON.stringify([
      {
        id: 42,
        link: "https://example.com/ai-market-map/",
        title: { rendered: "AI &amp; the New Market" },
        excerpt: { rendered: "<p>A first-party investment thesis.</p>" },
        date: "2026-07-10T14:30:00",
      },
    ]);

    const result = await adapter.collect(makeSource(), makeContext(body));

    expect(result[0]).toMatchObject({
      externalId: "42",
      url: "https://example.com/ai-market-map/",
      title: "AI & the New Market",
      summary: "A first-party investment thesis.",
    });
    expect(result[0]?.rawMeta.dateInferred).toBe(false);
  });

  it("parses wrapped response with data key", async () => {
    const body = JSON.stringify({
      data: [
        { title: "Post 1", url: "https://example.com/p1" },
        { title: "Post 2", url: "https://example.com/p2" },
      ],
      total: 2,
    });
    const result = await adapter.collect(makeSource(), makeContext(body));
    expect(result).toHaveLength(2);
    expect(result[0]?.title).toBe("Post 1");
  });

  it("parses wrapped response with items key", async () => {
    const body = JSON.stringify({
      items: [
        { name: "News 1", link: "https://example.com/n1" },
        { name: "News 2", link: "https://example.com/n2" },
      ],
    });
    const result = await adapter.collect(makeSource(), makeContext(body));
    expect(result).toHaveLength(2);
    expect(result[0]?.title).toBe("News 1");
  });

  it("parses wrapped response with results key", async () => {
    const body = JSON.stringify({
      results: [{ headline: "Breaking", href: "https://example.com/b" }],
    });
    const result = await adapter.collect(makeSource(), makeContext(body));
    expect(result).toHaveLength(1);
    expect(result[0]?.title).toBe("Breaking");
    expect(result[0]?.url).toBe("https://example.com/b");
  });

  it("parses nested response with dataPath config", async () => {
    const body = JSON.stringify({
      response: {
        docs: [{ title: "Doc 1", url: "https://example.com/d1" }],
      },
    });
    const source = makeSource({
      config: {
        url: "https://api.example.com/search",
        dataPath: "response.docs",
        take: 10,
      } as SourceDescriptor["config"] & { dataPath: string },
    });
    const result = await adapter.collect(source, makeContext(body));
    expect(result).toHaveLength(1);
    expect(result[0]?.title).toBe("Doc 1");
  });

  it("respects take limit", async () => {
    const items = Array.from({ length: 20 }, (_, i) => ({
      title: `Item ${i}`,
      url: `https://example.com/${i}`,
    }));
    const source = makeSource({ config: { url: "https://api.example.com/items", take: 5 } });
    const result = await adapter.collect(source, makeContext(JSON.stringify(items)));
    expect(result).toHaveLength(5);
  });

  it("extracts author when present", async () => {
    const body = JSON.stringify([
      {
        title: "Great Article",
        url: "https://example.com/g",
        author: "Jane Doe",
        publishedAt: "2026-01-01T00:00:00Z",
      },
    ]);
    const result = await adapter.collect(makeSource(), makeContext(body));
    expect(result[0]?.author).toBe("Jane Doe");
  });

  it("extracts tags from array field", async () => {
    const body = JSON.stringify([
      {
        title: "Tagged Article",
        url: "https://example.com/t",
        tags: ["AI", "ML", "Deep Learning"],
      },
    ]);
    const result = await adapter.collect(makeSource(), makeContext(body));
    expect(result[0]?.tags).toContain("AI");
    expect(result[0]?.tags).toContain("ML");
  });

  it("throws on non-array payload", async () => {
    const body = JSON.stringify({ not: "an array" });
    await expect(adapter.collect(makeSource(), makeContext(body))).rejects.toThrow(
      "no items found",
    );
  });

  it("throws on invalid JSON", async () => {
    await expect(adapter.collect(makeSource(), makeContext("not json"))).rejects.toThrow(
      "failed to parse JSON",
    );
  });

  it("auto-detects alternative field names", async () => {
    const body = JSON.stringify([
      {
        name: "Alternative Title",
        link: "https://example.com/alt",
        description: "Alt description",
        datePublished: "2026-06-15T00:00:00Z",
        type: "research",
        keywords: ["alt", "test"],
      },
    ]);
    const result = await adapter.collect(makeSource(), makeContext(body));
    expect(result[0]?.title).toBe("Alternative Title");
    expect(result[0]?.url).toBe("https://example.com/alt");
    expect(result[0]?.summary).toBe("Alt description");
    expect(result[0]?.category).toBe("research");
    expect(result[0]?.tags).toContain("alt");
  });
});
