import { XMLParser } from "fast-xml-parser";
import type { CollectedSignal } from "../domain/types.js";
import type { SourceAdapter } from "./types.js";

const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@_" });

export const rssAdapter: SourceAdapter = {
  kind: "rss",
  async collect(source, context) {
    const { body } = await context.fetchText(source.config.url);
    const document = parser.parse(body) as Record<string, unknown>;
    const items = extractItems(document);
    return items
      .slice(0, source.config.take ?? 50)
      .flatMap((item) => normalizeItem(item, source.language, source.config.category));
  },
};

function extractItems(document: Record<string, unknown>): Record<string, unknown>[] {
  const rss = document.rss as { channel?: { item?: unknown } } | undefined;
  const feed = document.feed as { entry?: unknown } | undefined;
  const value = rss?.channel?.item ?? feed?.entry ?? [];
  return (Array.isArray(value) ? value : [value]).filter(isRecord);
}

function normalizeItem(
  item: Record<string, unknown>,
  language: string,
  fallbackCategory?: string,
): CollectedSignal[] {
  const title = textValue(item.title);
  const link = linkValue(item.link);
  if (!title || !link) return [];
  const summary = stripHtml(
    textValue(item.description) || textValue(item.summary) || textValue(item.content) || title,
  );
  const published = textValue(item.pubDate) || textValue(item.published) || textValue(item.updated);
  return [
    {
      externalId: textValue(item.guid) || textValue(item.id) || link,
      url: link,
      title: stripHtml(title),
      summary: summary.slice(0, 8_000),
      language,
      publishedAt: validDate(published),
      category: fallbackCategory ?? "industry",
      tags: [],
      metrics: { platforms: ["rss"] },
      rawMeta: {},
    },
  ];
}

function textValue(value: unknown): string {
  if (typeof value === "string" || typeof value === "number") return String(value);
  if (isRecord(value)) return textValue(value["#text"] ?? value.__cdata ?? "");
  return "";
}

function linkValue(value: unknown): string {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) {
    const alternate = value.find(
      (item) => isRecord(item) && (!item["@_rel"] || item["@_rel"] === "alternate"),
    );
    return linkValue(alternate ?? value[0]);
  }
  if (isRecord(value)) return textValue(value["@_href"] ?? value["#text"]);
  return "";
}

function stripHtml(value: string): string {
  return value
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function validDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
