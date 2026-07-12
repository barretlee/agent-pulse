import { aiHotAdapter } from "./aihot.js";
import { genericApiAdapter } from "./generic-api.js";
import { githubReleasesAdapter } from "./github-releases.js";
import { huggingNewsAdapter } from "./huggingnews.js";
import { jsonApiAdapter } from "./json-api.js";
import { rssAdapter } from "./rss.js";
import type { SourceAdapter } from "./types.js";
import { webScraperAdapter } from "./web-scraper.js";

const adapters = new Map<string, SourceAdapter>(
  [
    aiHotAdapter,
    genericApiAdapter,
    githubReleasesAdapter,
    huggingNewsAdapter,
    jsonApiAdapter,
    rssAdapter,
    webScraperAdapter,
  ].map((adapter) => [adapter.kind, adapter]),
);

export function getAdapter(kind: string): SourceAdapter {
  const adapter = adapters.get(kind);
  if (!adapter) throw new Error(`Unknown source adapter: ${kind}`);
  return adapter;
}
