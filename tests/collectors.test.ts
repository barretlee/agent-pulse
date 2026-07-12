import { describe, expect, it } from "vitest";
import { aiHotAdapter } from "../src/collectors/aihot.js";
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
  fetchText: async () => ({
    body,
    status: 200,
    headers: new Headers(),
    attemptCount: 1,
    responseBytes: Buffer.byteLength(body),
    finalUrl: "https://example.com/feed",
  }),
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
    expect(items[0]?.rawMeta.dateInferred).toBe(false);
  });

  it("discovers an official alternate feed when a configured feed endpoint is stale", async () => {
    const homepage =
      '<html><head><link href="/updates.atom" type="application/atom+xml" rel="alternate"></head></html>';
    const feed =
      '<feed><entry><title>Recovered update</title><link href="/posts/recovered"/><published>2026-07-12T00:00:00Z</published><summary>Recovered from the declared feed.</summary></entry></feed>';
    let call = 0;
    const items = await rssAdapter.collect(source("rss"), {
      ...context(""),
      fetchText: async (url) => {
        call += 1;
        if (call === 1) throw new Error("HTTP 404");
        const body = call === 2 ? homepage : feed;
        return {
          body,
          status: 200,
          headers: new Headers(),
          attemptCount: 1,
          responseBytes: body.length,
          finalUrl: url,
        };
      },
    });
    expect(call).toBe(3);
    expect(items[0]?.url).toBe("https://example.com/posts/recovered");
  });

  it("marks missing dates as inferred instead of pretending they were published now", async () => {
    const items = await rssAdapter.collect(
      source("rss"),
      context(
        "<rss><channel><item><title>Undated</title><link>https://example.com/undated</link><description>No date.</description></item></channel></rss>",
      ),
    );
    expect(items[0]?.rawMeta.dateInferred).toBe(true);
  });
});

describe("HuggingNews adapter", () => {
  it("extracts public story heat metadata without copying article bodies", async () => {
    const html =
      '<details class="story-details is-top" data-fresh="recent"><summary><a class="story-row-link" href="/ai/model-launch-abcd"><div class="story-title">Model &amp; Agent Launch</div><div class="story-meta"><span class="meta-cat">AI</span><span class="meta-time">2h ago</span><span class="meta-signal">120/45</span></div></a></summary><div class="source-role">Source</div><span>@openai</span><div class="source-role">Support</div><span>@researcher</span></details>';
    const items = await huggingNewsAdapter.collect(source("huggingnews"), context(html));
    expect(items[0]?.metrics).toMatchObject({ tweets: 120, authors: 45 });
    expect(items[0]?.summary).toBe("Model & Agent Launch");
    expect(items[0]?.origin).toMatchObject({
      kind: "aggregator_story",
      handles: [
        { handle: "openai", role: "Source" },
        { handle: "researcher", role: "Support" },
      ],
    });
  });

  it("hydrates public selected-tweet provenance from a story page", async () => {
    const homepage =
      '<details class="story-details is-top" data-fresh="recent"><summary><a class="story-row-link" href="/ai/model-launch-abcd"><div class="story-title">Model Launch</div><div class="story-meta"><span class="meta-cat">AI</span><span class="meta-time">2h ago</span><span class="meta-signal">120/45</span></div></a></summary></details>';
    const detail =
      '<script>focusedStoryDetail:{data:{selectedTweets:[{authorHandle:"openai",bestBit:"Launch",label:"Source",text:"Launch",tweetId:"1",tweetedAt:1,url:"https://x.com/OpenAI/status/1"},{authorHandle:"researcher",bestBit:"Test",label:"Support",text:"Test",tweetId:"2",tweetedAt:2,url:"https://x.com/researcher/status/2"}]}}</script>';
    let request = 0;
    const items = await huggingNewsAdapter.collect(
      {
        ...source("huggingnews"),
        config: { url: "https://huggingnews.com", take: 1, detailTake: 1 },
      },
      {
        ...context(homepage),
        fetchText: async () => {
          const body = request++ === 0 ? homepage : detail;
          return {
            body,
            status: 200,
            headers: new Headers(),
            attemptCount: 1,
            responseBytes: Buffer.byteLength(body),
            finalUrl: "https://huggingnews.com",
          };
        },
      },
    );
    expect(items[0]?.origin).toEqual({
      url: "https://x.com/OpenAI/status/1",
      discoveryUrl: "https://example.com/ai/model-launch-abcd",
      name: "@openai",
      kind: "social",
      handle: "openai",
      handles: [
        { handle: "openai", role: "Source" },
        { handle: "researcher", role: "Support" },
      ],
    });
  });
});

describe("AI HOT adapter", () => {
  it("preserves the upstream publisher as origin and the aggregator only as discovery evidence", async () => {
    const payload = JSON.stringify({
      items: [
        {
          id: "item-1",
          title: "A primary model release",
          url: "https://openai.com/index/model-release/",
          permalink: "https://aihot.virxact.com/items/item-1",
          source: "OpenAI official RSS",
          publishedAt: "2026-07-11T08:00:00.000Z",
          summary: "Primary release summary",
          category: "model",
          score: 91,
          selected: true,
        },
      ],
    });
    const items = await aiHotAdapter.collect(
      { ...source("aihot"), role: "aggregator" },
      context(payload),
    );
    expect(items[0]?.origin).toEqual({
      url: "https://openai.com/index/model-release/",
      discoveryUrl: "https://aihot.virxact.com/items/item-1",
      name: "OpenAI official RSS",
      kind: "official",
    });
    expect(items[0]?.rawMeta).toMatchObject({ aggregator: "AI HOT", aggregatorScore: 91 });
  });
});
