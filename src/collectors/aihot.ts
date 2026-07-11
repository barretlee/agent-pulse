import type { CollectedSignal, OriginKind } from "../domain/types.js";
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
    const { body, status } = await context.fetchText(url.toString());
    if (status === 304) return [];
    const payload = JSON.parse(body) as { items?: AiHotItem[] };
    return (payload.items ?? []).map(normalize);
  },
};

function normalize(item: AiHotItem): CollectedSignal {
  const origin = classifyOrigin(item.url, item.source);
  return {
    externalId: item.id,
    url: item.url,
    title: item.title,
    summary: item.summary,
    language: "zh-CN",
    publishedAt: new Date(item.publishedAt).toISOString(),
    category: item.category,
    tags: [item.category],
    metrics: { platforms: ["aggregator"], regions: ["CN"] },
    origin: {
      url: item.url,
      discoveryUrl: item.permalink,
      name: item.source,
      kind: origin.kind,
      ...(origin.handle ? { handle: origin.handle } : {}),
    },
    rawMeta: {
      aggregator: "AI HOT",
      aggregatorPermalink: item.permalink,
      aggregatorSource: item.source,
      aggregatorScore: item.score,
      selected: item.selected,
    },
  };
}

function classifyOrigin(value: string, sourceName: string): { kind: OriginKind; handle?: string } {
  try {
    const url = new URL(value);
    const host = url.hostname.replace(/^www\./, "");
    if (host === "x.com" || host === "twitter.com") {
      const handle = url.pathname.split("/").filter(Boolean)[0];
      return handle ? { kind: "social", handle } : { kind: "social" };
    }
    if (host === "github.com") return { kind: "github" };
    if (host === "arxiv.org") return { kind: "paper" };
    if (/official|newsroom|research|blog|官方/i.test(sourceName)) return { kind: "official" };
    if (/techcrunch|the verge|ars technica|decoder|ithome|it之家|marktechpost/i.test(sourceName)) {
      return { kind: "media" };
    }
    return { kind: "unknown" };
  } catch {
    return { kind: "unknown" };
  }
}
