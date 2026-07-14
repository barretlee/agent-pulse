import { beforeAll, describe, expect, it } from "vitest";
import type { CollectContext, SourceAdapter } from "../../src/collectors/types.js";
import type { SourceDescriptor } from "../../src/domain/types.js";

let adapter: SourceAdapter;
beforeAll(async () => {
  const mod = await import("../../src/collectors/web-scraper.js");
  adapter = mod.webScraperAdapter;
});

function makeContext(body: string, status = 200, finalUrl = "https://example.com"): CollectContext {
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
      finalUrl,
    }),
  };
}

function makeSource(overrides?: Partial<SourceDescriptor>): SourceDescriptor {
  return {
    id: "test",
    slug: "test-site",
    name: "Test Site",
    homepageUrl: "https://example.com",
    adapter: "web-scraper",
    tier: 2,
    role: "media",
    region: "GLOBAL",
    language: "en",
    authorityScore: 70,
    config: { url: "https://example.com", category: "tech", take: 30 },
    state: {},
    ...overrides,
  };
}

describe("web-scraper adapter", () => {
  it("has kind web-scraper", () => {
    expect(adapter.kind).toBe("web-scraper");
  });

  it("returns empty for 304", async () => {
    const result = await adapter.collect(makeSource(), makeContext("", 304));
    expect(result).toEqual([]);
  });

  it("extracts articles from <article> tags", async () => {
    const html = `<!DOCTYPE html><html><body>
      <article>
        <h2><a href="/post/1">First Article Title</a></h2>
        <p>This is the summary of the first article with enough content to be meaningful for extraction purposes.</p>
        <time datetime="2026-07-01T10:00:00Z">July 1, 2026</time>
      </article>
      <article>
        <h3><a href="/post/2">Second Article</a></h3>
        <p>Summary of the second article that also has sufficient content for the scraper to pick up and analyze.</p>
        <time datetime="2026-07-02T10:00:00Z">July 2, 2026</time>
      </article>
    </body></html>`;
    const result = await adapter.collect(makeSource(), makeContext(html));
    expect(result.length).toBeGreaterThanOrEqual(1);
    const titles = result.map((r) => r.title);
    expect(titles.some((t) => t.includes("First Article"))).toBe(true);
    expect(result[0]?.url).toBe("https://example.com/post/1");
    expect(result[0]?.rawMeta.dateInferred).toBe(false);
  });

  it("extracts items from listing cards", async () => {
    const html = `<!DOCTYPE html><html><body>
      <div class="post-card">
        <h2><a href="/news/1">Breaking News</a></h2>
        <p>A detailed summary of breaking news that has enough content to be meaningful for the extraction system.</p>
      </div>
      <div class="post-card">
        <h3><a href="/news/2">Update Released</a></h3>
        <p>Details about the update release with sufficient text for the web scraper to extract meaningful information from the page.</p>
      </div>
    </body></html>`;
    const result = await adapter.collect(makeSource(), makeContext(html));
    expect(result.length).toBeGreaterThanOrEqual(1);
  });

  it("extracts explicit human-readable dates from article cards", async () => {
    const html = `<!DOCTYPE html><html><body>
      <article class="post-card">
        <h2><a href="/news/dated">A dated investment perspective</a></h2>
        <p>A substantive first-party article with a date rendered as visible text.</p>
        <div class="post-meta"><span>June 23, 2026</span></div>
      </article>
    </body></html>`;

    const result = await adapter.collect(makeSource(), makeContext(html));

    expect(result[0]?.publishedAt).toBe("2026-06-23T00:00:00.000Z");
    expect(result[0]?.rawMeta.dateInferred).toBe(false);
  });

  it("extracts JSON-LD structured data", async () => {
    const html = `<!DOCTYPE html><html><head>
      <script type="application/ld+json">
      {
        "@context": "https://schema.org",
        "@type": "BlogPosting",
        "headline": "Structured Data Article",
        "url": "https://example.com/structured",
        "description": "This article uses JSON-LD structured data for rich metadata extraction.",
        "datePublished": "2026-07-05T08:00:00Z",
        "keywords": ["AI", "structured-data", "metadata"]
      }
      </script>
    </head><body></body></html>`;
    const result = await adapter.collect(makeSource(), makeContext(html));
    expect(result.length).toBeGreaterThanOrEqual(1);
    expect(result[0]?.title).toBe("Structured Data Article");
    expect(result[0]?.url).toBe("https://example.com/structured");
    expect(result[0]?.tags).toContain("AI");
  });

  it("extracts JSON-LD with @graph", async () => {
    const html = `<!DOCTYPE html><html><head>
      <script type="application/ld+json">
      {
        "@context": "https://schema.org",
        "@graph": [
          { "@type": "NewsArticle", "headline": "Graph Article 1", "url": "https://example.com/g1", "description": "First graph article description with details." },
          { "@type": "NewsArticle", "headline": "Graph Article 2", "url": "https://example.com/g2", "description": "Second graph article description with details." }
        ]
      }
      </script>
    </head><body></body></html>`;
    const result = await adapter.collect(makeSource(), makeContext(html));
    expect(result.length).toBeGreaterThanOrEqual(1);
  });

  it("discovers and follows RSS feed links", async () => {
    const pageHtml = `<!DOCTYPE html><html><head>
      <link rel="alternate" type="application/rss+xml" href="/feed.xml" />
    </head><body></body></html>`;

    const feedXml = `<?xml version="1.0"?>
    <rss version="2.0"><channel>
      <item><title>Feed Item 1</title><link>https://example.com/f1</link><pubDate>Mon, 01 Jul 2026 10:00:00 GMT</pubDate><description>Feed item 1 description.</description></item>
      <item><title>Feed Item 2</title><link>https://example.com/f2</link><pubDate>Tue, 02 Jul 2026 10:00:00 GMT</pubDate><description>Feed item 2 description.</description></item>
    </channel></rss>`;

    // Mock fetchText to return page first, then feed
    let callCount = 0;
    const ctx: CollectContext = {
      config: makeContext("").config,
      fetchText: async () => {
        callCount++;
        if (callCount === 1) {
          return {
            body: pageHtml,
            status: 200,
            headers: new Headers(),
            attemptCount: 1,
            responseBytes: pageHtml.length,
            finalUrl: "https://example.com",
          };
        }
        return {
          body: feedXml,
          status: 200,
          headers: new Headers(),
          attemptCount: 1,
          responseBytes: feedXml.length,
          finalUrl: "https://example.com/feed.xml",
        };
      },
    };

    const result = await adapter.collect(makeSource(), ctx);
    expect(result.length).toBeGreaterThanOrEqual(1);
  });

  it("prefers a discovered feed when HTML cards only have inferred dates", async () => {
    const pageHtml = `<!DOCTYPE html><html><head>
      <link rel="alternate" type="application/rss+xml" href="/feed.xml" />
    </head><body><article><h2><a href="/undated">Undated HTML card</a></h2></article></body></html>`;
    const feedXml = `<rss><channel><item><title>Dated feed item</title><link>https://example.com/dated</link><pubDate>Wed, 08 Jul 2026 10:00:00 GMT</pubDate><description>Trusted date.</description></item></channel></rss>`;
    const requests: string[] = [];
    const context = makeContext("");
    context.fetchText = async (url) => {
      requests.push(url);
      const responseBody = requests.length === 1 ? pageHtml : feedXml;
      return {
        body: responseBody,
        status: 200,
        headers: new Headers(),
        attemptCount: 1,
        responseBytes: responseBody.length,
        finalUrl: url,
      };
    };

    const result = await adapter.collect(makeSource(), context);

    expect(requests).toEqual(["https://example.com", "https://example.com/feed.xml"]);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      title: "Dated feed item",
      publishedAt: "2026-07-08T10:00:00.000Z",
      rawMeta: { source: "discovered-feed", dateInferred: false },
    });
  });

  it("falls back to page meta when no articles found", async () => {
    const html = `<!DOCTYPE html><html><head>
      <meta property="og:title" content="Page Meta Title" />
      <meta property="og:type" content="article" />
      <meta property="og:url" content="https://example.com/page" />
      <meta property="og:description" content="This is the meta description of the page used as fallback." />
      <meta property="article:published_time" content="2026-07-10T00:00:00Z" />
      <title>Site Title</title>
    </head><body><p>Just some text, no articles here.</p></body></html>`;
    const result = await adapter.collect(makeSource(), makeContext(html));
    expect(result.length).toBeGreaterThanOrEqual(1);
    expect(result[0]?.title).toBe("Page Meta Title");
  });

  it("does not turn a generic marketing homepage into a current news signal", async () => {
    const html = `<!DOCTYPE html><html><head>
      <meta property="og:title" content="Company Homepage" />
      <meta property="og:url" content="https://example.com/" />
      <meta property="og:description" content="Build the future with our platform." />
      <title>Company Homepage</title>
    </head><body><main>Products and navigation only.</main></body></html>`;
    const result = await adapter.collect(makeSource(), makeContext(html));
    expect(result).toEqual([]);
  });

  it("throws on empty body", async () => {
    await expect(adapter.collect(makeSource(), makeContext(""))).rejects.toThrow(
      "response body too small",
    );
  });

  it("deduplicates by URL", async () => {
    const html = `<!DOCTYPE html><html><head>
      <script type="application/ld+json">
      { "@type": "BlogPosting", "headline": "Same Article", "url": "https://example.com/same", "description": "Duplicate." }
      </script>
    </head><body>
      <article><h2><a href="https://example.com/same">Same Article</a></h2><p>Duplicate.</p></article>
    </body></html>`;
    const result = await adapter.collect(makeSource(), makeContext(html));
    const urls = result.map((r) => r.url);
    const sameUrls = urls.filter((u) => u === "https://example.com/same");
    expect(sameUrls.length).toBe(1);
  });

  it("respects take limit", async () => {
    const articles = Array.from(
      { length: 40 },
      (_, i) =>
        `<article><h2><a href="/post/${i}">Article ${i}</a></h2><p>Summary for article ${i} with enough content to be meaningful and extractable.</p><time datetime="2026-07-${String(i + 1).padStart(2, "0")}T00:00:00Z"></time></article>`,
    ).join("");
    const html = `<!DOCTYPE html><html><body>${articles}</body></html>`;
    const result = await adapter.collect(
      makeSource({ config: { url: "https://example.com", take: 5 } }),
      makeContext(html),
    );
    expect(result.length).toBeLessThanOrEqual(5);
  });
});
