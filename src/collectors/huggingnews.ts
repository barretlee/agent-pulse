import type { CollectedSignal } from "../domain/types.js";
import type { SourceAdapter } from "./types.js";

const STORY_PATTERN =
  /<details class="story-details[^>]*data-fresh="([^"]+)"[^>]*>[\s\S]*?<a class="story-row-link" href="([^"]+)"[\s\S]*?<div class="story-title">([\s\S]*?)<div class="story-meta">[\s\S]*?<span class="meta-cat">([^<]+)<\/span>[\s\S]*?<span class="meta-time">([^<]+)<\/span>[\s\S]*?<span class="meta-signal">(\d+)\/(\d+)<\/span>[\s\S]*?<\/details>/g;

export const huggingNewsAdapter: SourceAdapter = {
  kind: "huggingnews",
  async collect(source, context) {
    const { body, status } = await context.fetchText(source.config.url);
    if (status === 304) return [];
    const results: CollectedSignal[] = [];
    for (const match of body.matchAll(STORY_PATTERN)) {
      const [
        ,
        freshness = "unknown",
        href = "",
        rawTitle = "",
        category = "AI",
        relativeTime = "",
        tweets = "0",
        authors = "0",
      ] = match;
      const title = decodeEntities(
        rawTitle
          .replace(/<[^>]+>|<!--[\s\S]*?-->/g, " ")
          .replace(/\s+/g, " ")
          .trim(),
      );
      if (!title || !href) continue;
      const storyUrl = new URL(href, source.homepageUrl).toString();
      const handles = extractHandles(match[0]);
      results.push({
        externalId: href.split("-").at(-1) ?? href,
        url: storyUrl,
        title,
        summary: title,
        language: "en",
        publishedAt: approximateDate(relativeTime),
        category: category.toLowerCase(),
        tags: [category],
        metrics: {
          tweets: Number(tweets),
          authors: Number(authors),
          platforms: ["x"],
          regions: ["GLOBAL"],
        },
        origin: {
          discoveryUrl: storyUrl,
          name: "HuggingNews story cluster",
          kind: "aggregator_story",
          handles,
        },
        rawMeta: {
          aggregator: "HuggingNews",
          freshness,
          relativeTime,
          keySourceHandles: handles,
        },
      });
      if (results.length >= (source.config.take ?? 50)) break;
    }
    if (results.length === 0) throw new Error("HuggingNews contract drift: no stories matched");
    const detailTake = Math.min(source.config.detailTake ?? 3, results.length);
    for (const item of results.slice(0, detailTake)) {
      const { body: detailBody, status: detailStatus } = await context.fetchText(item.url);
      if (detailStatus === 304) continue;
      const tweets = extractSelectedTweets(detailBody);
      if (tweets.length === 0) continue;
      const sourceTweet =
        tweets.find((tweet) => tweet.role.toLowerCase() === "source") ?? tweets[0];
      if (!sourceTweet) continue;
      item.origin = {
        url: sourceTweet.url,
        discoveryUrl: item.url,
        name: `@${sourceTweet.handle}`,
        kind: "social",
        handle: sourceTweet.handle,
        handles: tweets.map(({ handle, role }) => ({ handle, role })),
      };
      item.rawMeta = {
        ...item.rawMeta,
        keySourceHandles: item.origin.handles,
        selectedSourceUrls: tweets.map(({ url }) => url),
      };
    }
    return results;
  },
};

function approximateDate(value: string): string {
  const amount = Number(value.match(/\d+/)?.[0] ?? 0);
  const multiplier = value.includes("d") ? 86_400_000 : value.includes("m") ? 60_000 : 3_600_000;
  return new Date(Date.now() - amount * multiplier).toISOString();
}

function extractHandles(html: string): Array<{ handle: string; role?: string }> {
  const handles = new Map<string, { handle: string; role?: string }>();
  for (const match of html.matchAll(/(?:^|[^\w])@([A-Za-z0-9_]{1,15})/g)) {
    const handle = match[1];
    if (!handle) continue;
    const key = handle.toLowerCase();
    const context = html.slice(Math.max(0, (match.index ?? 0) - 120), match.index ?? 0);
    const roleMatches = [...context.matchAll(/(?:source-role|role)[^>]*>\s*([^<]{1,30})</gi)];
    const role = roleMatches.at(-1)?.[1]?.trim();
    handles.set(key, { handle, ...(role ? { role } : {}) });
  }
  return [...handles.values()];
}

function extractSelectedTweets(html: string): Array<{ handle: string; role: string; url: string }> {
  const tweets = new Map<string, { handle: string; role: string; url: string }>();
  const pattern =
    /authorHandle:"([A-Za-z0-9_]{1,15})"[\s\S]{0,1500}?label:"([^"]{1,30})"[\s\S]{0,3000}?url:"(https:\/\/x\.com\/[^"]+)"/g;
  for (const match of html.matchAll(pattern)) {
    const [, handle, role, url] = match;
    if (!handle || !role || !url) continue;
    tweets.set(url, { handle, role, url });
  }
  return [...tweets.values()];
}

function decodeEntities(value: string): string {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}
