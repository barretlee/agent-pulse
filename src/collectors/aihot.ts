import type { CollectedSignal } from "../domain/types.js";
import type { SourceAdapter } from "./types.js";

interface AiHotItem {
  id: string;
  title: string;
  url: string;
  permalink: string;
  source: string;
  publishedAt: string;
  summary: string;
  category: string;
  score: number;
  selected: boolean;
}

export const aiHotAdapter: SourceAdapter = {
  kind: "aihot",
  async collect(source, context) {
    const url = new URL(source.config.url);
    url.searchParams.set("mode", source.config.mode ?? "selected");
    url.searchParams.set("take", String(source.config.take ?? 50));
    const { body } = await context.fetchText(url.toString());
    const payload = JSON.parse(body) as { items?: AiHotItem[] };
    return (payload.items ?? []).map(normalize);
  },
};

function normalize(item: AiHotItem): CollectedSignal {
  return {
    externalId: item.id,
    url: item.url,
    title: item.title,
    summary: item.summary,
    language: "zh-CN",
    publishedAt: new Date(item.publishedAt).toISOString(),
    category: item.category,
    tags: [item.category],
    metrics: { independentSources: 1, platforms: ["aggregator"], regions: ["CN"] },
    rawMeta: {
      aggregator: "AI HOT",
      aggregatorPermalink: item.permalink,
      aggregatorSource: item.source,
      aggregatorScore: item.score,
      selected: item.selected,
    },
  };
}
