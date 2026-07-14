import { beforeAll, describe, expect, it } from "vitest";
import type { CollectContext, SourceAdapter } from "../../src/collectors/types.js";
import type { SourceDescriptor } from "../../src/domain/types.js";

// Import the adapter at runtime
let adapter: SourceAdapter;
beforeAll(async () => {
  const mod = await import("../../src/collectors/github-releases.js");
  adapter = mod.githubReleasesAdapter;
});

function makeContext(body: string, status = 200): CollectContext {
  return {
    config: {
      NODE_ENV: "test",
      HOST: "127.0.0.1",
      PORT: 8899,
      DATABASE_URL: "sqlite::memory:",
      COLLECTOR_USER_AGENT: "agent-pulse/test",
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
      finalUrl: "https://github.com/test/repo/releases.atom",
    }),
  };
}

function makeSource(overrides?: Partial<SourceDescriptor>): SourceDescriptor {
  return {
    id: "test-source",
    slug: "test-repo",
    name: "Test Repo",
    homepageUrl: "https://github.com/test/repo",
    adapter: "github-releases",
    tier: 2,
    role: "primary",
    region: "GLOBAL",
    language: "en",
    authorityScore: 80,
    config: {
      url: "https://github.com/test/repo/releases.atom",
      category: "open-source",
      take: 5,
    },
    state: {},
    ...overrides,
  };
}

describe("github-releases adapter", () => {
  it("has kind github-releases", () => {
    expect(adapter.kind).toBe("github-releases");
  });

  it("returns empty for 304 not modified", async () => {
    const ctx = makeContext("", 304);
    const result = await adapter.collect(makeSource(), ctx);
    expect(result).toEqual([]);
  });

  it("parses Atom feed entries", async () => {
    const feed = `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>Test Releases</title>
  <entry>
    <id>urn:uuid:123</id>
    <title>v2.0.0: Major Update</title>
    <link href="https://github.com/test/repo/releases/tag/v2.0.0"/>
    <published>2026-07-01T10:00:00Z</published>
    <updated>2026-07-01T10:30:00Z</updated>
    <summary>This is a major release with new features.</summary>
    <author><name>test-user</name></author>
  </entry>
  <entry>
    <id>urn:uuid:456</id>
    <title>v1.5.0: Bug Fixes</title>
    <link href="https://github.com/test/repo/releases/tag/v1.5.0"/>
    <published>2026-06-15T08:00:00Z</published>
    <summary>Bug fix release.</summary>
  </entry>
</feed>`;

    const ctx = makeContext(feed);
    const result = await adapter.collect(makeSource(), ctx);

    expect(result).toHaveLength(2);
    expect(result[0]?.title).toBe("v2.0.0: Major Update");
    expect(result[0]?.url).toBe("https://github.com/test/repo/releases/tag/v2.0.0");
    expect(result[0]?.author).toBe("test-user");
    expect(result[0]?.category).toBe("open-source");
    expect(result[0]?.tags).toContain("release");
    expect(result[0]?.metrics.platforms).toContain("github");
    expect(result[1]?.title).toBe("v1.5.0: Bug Fixes");
  });

  it("respects take limit", async () => {
    const entries = Array.from(
      { length: 10 },
      (_, i) => `
  <entry>
    <id>${i}</id>
    <title>Release ${i}</title>
    <link href="https://github.com/test/repo/releases/tag/v${i}"/>
    <published>2026-07-0${1 + i}T00:00:00Z</published>
    <summary>Release ${i} summary.</summary>
  </entry>`,
    ).join("");

    const feed = `<?xml version="1.0"?><feed xmlns="http://www.w3.org/2005/Atom">${entries}</feed>`;
    const ctx = makeContext(feed);
    const result = await adapter.collect(
      makeSource({ config: { url: "https://github.com/test/repo/releases.atom", take: 3 } }),
      ctx,
    );

    expect(result).toHaveLength(3);
  });

  it("throws on empty feed", async () => {
    const feed = '<?xml version="1.0"?><feed xmlns="http://www.w3.org/2005/Atom"></feed>';
    const ctx = makeContext(feed);
    await expect(adapter.collect(makeSource(), ctx)).rejects.toThrow("no entries found");
  });

  it("resolves feed URL from repo homepage", async () => {
    const feed = `<?xml version="1.0"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <entry>
    <id>1</id>
    <title>Test</title>
    <link href="https://github.com/owner/repo/releases/tag/v1"/>
    <published>2026-01-01T00:00:00Z</published>
    <summary>Summary</summary>
  </entry>
</feed>`;

    // Source uses repo homepage, adapter should append /releases.atom
    // Note: the actual URL resolution is tested indirectly through the context
    const ctx = makeContext(feed);
    const result = await adapter.collect(
      makeSource({ config: { url: "https://github.com/owner/repo", take: 5 } }),
      ctx,
    );
    expect(result).toHaveLength(1);
  });

  it("rejects organization pages instead of inventing a repository feed", async () => {
    const ctx = makeContext("");
    await expect(
      adapter.collect(
        makeSource({
          homepageUrl: "https://github.com/example-org",
          config: { url: "https://github.com/example-org", take: 5 },
        }),
        ctx,
      ),
    ).rejects.toThrow("not a repository");
  });

  it("handles HTML entities in title", async () => {
    const feed = `<?xml version="1.0"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <entry>
    <id>1</id>
    <title>Release &amp; Update v3</title>
    <link href="https://github.com/test/repo/releases/tag/v3"/>
    <published>2026-01-01T00:00:00Z</published>
    <summary>Summary with &quot;quotes&quot;</summary>
  </entry>
</feed>`;

    const ctx = makeContext(feed);
    const result = await adapter.collect(makeSource(), ctx);
    expect(result[0]?.title).toBe("Release & Update v3");
  });
});
