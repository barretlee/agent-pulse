import { describe, expect, it } from "vitest";
import { huggingNewsAdapter } from "../src/collectors/huggingnews.js";
import { rssAdapter } from "../src/collectors/rss.js";
import type { CollectContext } from "../src/collectors/types.js";
import { loadConfig } from "../src/config/env.js";
import type { SourceDescriptor } from "../src/domain/types.js";

const source = (adapter: string): SourceDescriptor => ({
  id: "source",
  slug: adapter,
  name: adapter,
  homepageUrl: "https://example.com",
  adapter,
  tier: 1,
  role: "primary",
  region: "GLOBAL",
  language: "en",
  authorityScore: 90,
  config: { url: "https://example.com/feed", take: 10 },
  state: {},
});

const context = (body: string): CollectContext => ({
  config: loadConfig({ NODE_ENV: "test", DATABASE_URL: "sqlite::memory:" }),
  fetchText: async () => ({ body, status: 200, headers: new Headers() }),
});

describe("RSS adapter", () => {
  it("normalizes RSS items", async () => {
    const items = await rssAdapter.collect(
      source("rss"),
      context(
        "<rss><channel><item><title>Model launch</title><link>https://example.com/model</link><description>New &lt;b&gt;model&lt;/b&gt;</description><pubDate>Fri, 11 Jul 2026 08:00:00 GMT</pubDate></item></channel></rss>",
      ),
    );
    expect(items).toHaveLength(1);
    expect(items[0]?.summary).toBe("New model");
  });
});

describe("HuggingNews adapter", () => {
  it("extracts public story heat metadata without copying article bodies", async () => {
    const html =
      '<details class="story-details is-top" data-fresh="recent"><summary><a class="story-row-link" href="/ai/model-launch-abcd"><div class="story-title">Model &amp; Agent Launch</div><div class="story-meta"><span class="meta-cat">AI</span><span class="meta-time">2h ago</span><span class="meta-signal">120/45</span></div></a></summary></details>';
    const items = await huggingNewsAdapter.collect(source("huggingnews"), context(html));
    expect(items[0]?.metrics).toMatchObject({ tweets: 120, authors: 45 });
    expect(items[0]?.summary).toBe("Model & Agent Launch");
  });
});
