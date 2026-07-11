import type { CollectedSignal } from "../domain/types.js";
import type { SourceAdapter } from "./types.js";

const STORY_PATTERN =
  /<details class="story-details[^>]*data-fresh="([^"]+)"[^>]*>[\s\S]*?<a class="story-row-link" href="([^"]+)"[\s\S]*?<div class="story-title">([\s\S]*?)<div class="story-meta">[\s\S]*?<span class="meta-cat">([^<]+)<\/span>[\s\S]*?<span class="meta-time">([^<]+)<\/span>[\s\S]*?<span class="meta-signal">(\d+)\/(\d+)<\/span>[\s\S]*?<\/details>/g;

export const huggingNewsAdapter: SourceAdapter = {
  kind: "huggingnews",
  async collect(source, context) {
    const { body } = await context.fetchText(source.config.url);
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
      results.push({
        externalId: href.split("-").at(-1) ?? href,
        url: new URL(href, source.homepageUrl).toString(),
        title,
        summary: title,
        language: "en",
        publishedAt: approximateDate(relativeTime),
        category: category.toLowerCase(),
        tags: [category],
        metrics: {
          tweets: Number(tweets),
          authors: Number(authors),
          independentSources: Number(authors),
          platforms: ["x"],
          regions: ["GLOBAL"],
        },
        rawMeta: { aggregator: "HuggingNews", freshness, relativeTime },
      });
      if (results.length >= (source.config.take ?? 50)) break;
    }
    return results;
  },
};

function approximateDate(value: string): string {
  const amount = Number(value.match(/\d+/)?.[0] ?? 0);
  const multiplier = value.includes("d") ? 86_400_000 : value.includes("m") ? 60_000 : 3_600_000;
  return new Date(Date.now() - amount * multiplier).toISOString();
}

function decodeEntities(value: string): string {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}
