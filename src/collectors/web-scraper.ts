import type { CollectedSignal } from "../domain/types.js";
import type { SourceAdapter } from "./types.js";

/**
 * Web scraper adapter for HTML sources.
 *
 * Extracts structured signals from HTML pages by looking for common patterns:
 * - Article/list items with <article>, <li>, or <div class="post/item/...">
 * - Open Graph / meta tags for metadata
 * - JSON-LD structured data
 * - RSS/Atom link discovery for feed-backed sites
 *
 * This is a best-effort adapter for sources without a dedicated API or RSS feed.
 * It prioritizes structured extraction over perfect recall.
 */

const MAX_ITEMS = 30;

export const webScraperAdapter: SourceAdapter = {
  kind: "web-scraper",
  async collect(source, context) {
    const { body, status } = await context.fetchText(source.config.url);
    if (status === 304) return [];

    if (!body || body.length < 100) {
      throw new Error("Web scraper: response body too small or empty");
    }

    const results: CollectedSignal[] = [];

    // Strategy 1: Try JSON-LD structured data first
    const jsonLdItems = extractJsonLd(body, source);
    if (jsonLdItems.length > 0) {
      results.push(...jsonLdItems);
    }

    // Strategy 2: Extract from <article> or common listing patterns
    const articleItems = extractArticles(body, source);
    results.push(...articleItems);

    // Strategy 3: Extract from <li> or card patterns in listing pages
    const listItems = extractListItems(body, source);
    results.push(...listItems);

    // Strategy 4: Extract from RSS/Atom discovery links
    const feedUrl = discoverFeed(body, source.homepageUrl);
    if (feedUrl && results.length === 0) {
      const { body: feedBody, status: feedStatus } = await context.fetchText(feedUrl);
      if (feedStatus === 200 && feedBody) {
        const feedItems = parseFeed(feedBody, source);
        results.push(...feedItems);
      }
    }

    // Deduplicate by URL
    const seen = new Set<string>();
    const deduped = results.filter((item) => {
      if (seen.has(item.url)) return false;
      seen.add(item.url);
      return true;
    });

    if (deduped.length === 0) {
      // Last resort: extract page metadata as a single signal
      const metaSignal = extractPageMeta(body, source);
      if (metaSignal) deduped.push(metaSignal);
    }

    return deduped.slice(0, source.config.take ?? MAX_ITEMS);
  },
};

// ─── JSON-LD Extraction ────────────────────────────────────────────────

function extractJsonLd(body: string, source: SourceLike): CollectedSignal[] {
  const results: CollectedSignal[] = [];
  const ldRegex = /<script[^>]+type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi;
  for (const match of body.matchAll(ldRegex)) {
    try {
      const data = JSON.parse(match[1] ?? "{}");
      const items = normalizeJsonLd(data, source);
      results.push(...items);
    } catch {
      // Skip malformed JSON-LD
    }
  }
  return results;
}

interface SourceLike {
  language: string;
  homepageUrl?: string;
  config: { url: string; category?: string | undefined; take?: number | undefined };
}

function normalizeJsonLd(data: unknown, source: SourceLike): CollectedSignal[] {
  const items: CollectedSignal[] = [];
  const record = isRecord(data) ? data : {};
  const graph = Array.isArray(record["@graph"])
    ? (record["@graph"] as Record<string, unknown>[])
    : [record];

  for (const node of graph) {
    if (!isRecord(node)) continue;
    const type = String(node["@type"] ?? "");
    if (
      type === "BlogPosting" ||
      type === "Article" ||
      type === "NewsArticle" ||
      type === "ListItem"
    ) {
      const title = String(node.headline ?? node.name ?? "");
      const mainEntity = isRecord(node.mainEntityOfPage)
        ? String(node.mainEntityOfPage["@id"] ?? node.mainEntityOfPage.url ?? "")
        : String(node.mainEntityOfPage ?? "");
      const url = resolvePublicUrl(String(node.url ?? mainEntity), source.config.url);
      if (!title || !url) continue;
      const date = normalizeDate(String(node.datePublished ?? node.dateCreated ?? ""));
      items.push({
        externalId: String(node.identifier ?? node["@id"] ?? url),
        url,
        title: stripHtml(decodeEntities(title)),
        summary: stripHtml(
          decodeEntities(String(node.description ?? node.abstract ?? title)),
        ).slice(0, 8_000),
        language: source.language,
        publishedAt: date.value,
        category: source.config.category ?? "industry",
        tags: Array.isArray(node.keywords)
          ? node.keywords.filter((k): k is string => typeof k === "string")
          : [],
        metrics: { platforms: ["web"] },
        rawMeta: {
          adapter: "web-scraper",
          source: "json-ld",
          type,
          dateInferred: date.inferred,
        },
      });
    }
  }
  return items;
}

// ─── Article Extraction ─────────────────────────────────────────────────

function extractArticles(body: string, source: SourceLike): CollectedSignal[] {
  const results: CollectedSignal[] = [];
  // Match <article> blocks or common listing containers
  const articleRegex = /<article[\s\S]*?>([\s\S]*?)<\/article>/gi;
  for (const match of body.matchAll(articleRegex)) {
    const block = match[1] ?? "";
    const signal = extractCardSignal(block, source);
    if (signal) results.push(signal);
  }
  return results;
}

// ─── List Item Extraction ───────────────────────────────────────────────

function extractListItems(body: string, source: SourceLike): CollectedSignal[] {
  const results: CollectedSignal[] = [];
  // Match common card/post patterns
  const cardPatterns = [
    /<li[^>]*class="[^"]*(?:post|item|card|entry|story|article)[^"]*"[^>]*>([\s\S]*?)<\/li>/gi,
    /<div[^>]*class="[^"]*(?:post|item|card|entry|story|article)[^"]*"[^>]*>([\s\S]*?)<\/div>/gi,
    /<a[^>]*class="[^"]*(?:post|item|card|entry|story)[^"]*"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi,
  ];

  for (const pattern of cardPatterns) {
    for (const match of body.matchAll(pattern)) {
      if (pattern.source.includes("href=")) {
        // Pattern 3: the URL is captured in group 1
        const href = match[1] ?? "";
        const innerHtml = match[2] ?? "";
        const signal = extractCardSignal(innerHtml, source, href);
        if (signal) results.push(signal);
      } else {
        const block = match[1] ?? "";
        const signal = extractCardSignal(block, source);
        if (signal) results.push(signal);
      }
    }
    if (results.length >= 5) break;
  }
  return results;
}

// ─── Card Signal Extraction ──────────────────────────────────────────────

function extractCardSignal(
  html: string,
  source: SourceLike,
  fallbackHref?: string,
): CollectedSignal | null {
  const rawLink = fallbackHref ?? extractFirstLink(html);
  const link = resolvePublicUrl(rawLink, source.config.url);
  const title = extractFirstHeading(html);
  if (!title && !link) return null;

  // Try <time> element for date
  const date = normalizeDate(extractPublishedDate(html));

  const summary = stripHtml(decodeEntities(extractTextContent(html).slice(0, 500)));

  return {
    externalId: link ?? title ?? sha256Short(summary),
    url: link ?? "",
    title: stripHtml(decodeEntities(title ?? summary.slice(0, 100))),
    summary: summary.slice(0, 8_000),
    language: source.language,
    publishedAt: date.value,
    category: source.config.category ?? "industry",
    tags: [],
    metrics: { platforms: ["web"] },
    rawMeta: {
      adapter: "web-scraper",
      source: "html-card",
      dateInferred: date.inferred,
    },
  };
}

// ─── Feed Discovery ──────────────────────────────────────────────────────

function discoverFeed(html: string, homepageUrl: string): string | null {
  // <link rel="alternate" type="application/rss+xml" href="...">
  const feedLinkMatch = html.match(
    /<link[^>]+rel="alternate"[^>]+type="application\/(?:rss|atom)\+xml"[^>]+href="([^"]+)"/i,
  );
  if (feedLinkMatch?.[1]) {
    return new URL(feedLinkMatch[1], homepageUrl).toString();
  }
  // Also try reversed attribute order
  const altMatch = html.match(
    /<link[^>]+type="application\/(?:rss|atom)\+xml"[^>]+rel="alternate"[^>]+href="([^"]+)"/i,
  );
  if (altMatch?.[1]) {
    return new URL(altMatch[1], homepageUrl).toString();
  }
  return null;
}

// ─── Simple Feed Parser (RSS/Atom subset) ──────────────────────────────

interface FeedItem {
  title: string;
  link: string;
  pubDate: string;
  description: string;
}

function parseFeed(xml: string, source: SourceLike): CollectedSignal[] {
  const items: FeedItem[] = [];
  // Match <item> (RSS) or <entry> (Atom)
  const itemRegex = /<(?:item|entry)>([\s\S]*?)<\/(?:item|entry)>/gi;
  for (const match of xml.matchAll(itemRegex)) {
    const block = match[1] ?? "";
    items.push({
      title: extractXmlTag(block, "title"),
      link: extractXmlLink(block),
      pubDate: extractXmlTag(block, "pubDate") || extractXmlTag(block, "published"),
      description: extractXmlTag(block, "description") || extractXmlTag(block, "summary"),
    });
  }

  return items
    .filter((item) => item.title && item.link)
    .map((item) => ({
      externalId: item.link,
      url: resolvePublicUrl(item.link, source.config.url) ?? "",
      title: stripHtml(decodeEntities(item.title)),
      summary: stripHtml(decodeEntities(item.description || item.title)).slice(0, 8_000),
      language: source.language,
      publishedAt: normalizeDate(item.pubDate).value,
      category: source.config.category ?? "industry",
      tags: [],
      metrics: { platforms: ["web", "rss"] },
      rawMeta: {
        adapter: "web-scraper",
        source: "discovered-feed",
        dateInferred: normalizeDate(item.pubDate).inferred,
      },
    }));
}

function extractXmlTag(xml: string, tag: string): string {
  const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i");
  return regex.exec(xml)?.[1]?.trim() ?? "";
}

function extractXmlLink(xml: string): string {
  const href = xml.match(/<link[^>]+href="([^"]+)"/i);
  return href?.[1] ?? extractXmlTag(xml, "link");
}

// ─── Page Metadata Fallback ──────────────────────────────────────────────

function extractPageMeta(body: string, source: SourceLike): CollectedSignal | null {
  const ogTitle = extractMetaTag(body, "og:title");
  const ogUrl = extractMetaTag(body, "og:url");
  const ogDesc = extractMetaTag(body, "og:description");
  const ogType = extractMetaTag(body, "og:type");
  const publishedValue =
    extractMetaTag(body, "article:published_time") || extractMetaTag(body, "datePublished");
  const title = ogTitle || extractTagContent(body, "title");

  if (!title || !/article|news/i.test(ogType) || !publishedValue) return null;

  const fallbackUrl = resolvePublicUrl(ogUrl || source.config.url || "", source.config.url);
  if (!fallbackUrl) return null;
  const date = normalizeDate(publishedValue);
  if (date.inferred) return null;

  return {
    externalId: fallbackUrl || "page-meta",
    url: fallbackUrl,
    title: stripHtml(decodeEntities(title)),
    summary: stripHtml(decodeEntities(ogDesc || title)).slice(0, 8_000),
    language: source.language,
    publishedAt: date.value,
    category: source.config.category ?? "industry",
    tags: [],
    metrics: { platforms: ["web"] },
    rawMeta: { adapter: "web-scraper", source: "page-meta", dateInferred: false },
  };
}

function extractMetaTag(html: string, property: string): string {
  const regex = new RegExp(`<meta[^>]+(?:property|name)="${property}"[^>]+content="([^"]+)"`, "i");
  const match = html.match(regex);
  if (match?.[1]) return match[1];
  // Try reversed attribute order
  const altRegex = new RegExp(
    `<meta[^>]+content="([^"]+)"[^>]+(?:property|name)="${property}"`,
    "i",
  );
  return html.match(altRegex)?.[1] ?? "";
}

// ─── Helpers ─────────────────────────────────────────────────────────────

function extractFirstLink(html: string): string {
  const match = html.match(/<a[^>]+href="([^"]+)"[^>]*>/i);
  return match?.[1] ?? "";
}

function extractFirstHeading(html: string): string {
  for (const tag of ["h1", "h2", "h3", "h4"]) {
    const match = html.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i"));
    if (match?.[1]) return match[1].trim();
  }
  return "";
}

function extractPublishedDate(html: string): string {
  const time = html.match(/<time[^>]*datetime=["']([^"']+)["'][^>]*>/i)?.[1];
  if (time) return time;
  const itemProp = html.match(
    /<(?:meta|time)[^>]+(?:itemprop|property|name)=["'](?:datePublished|article:published_time|publishdate)["'][^>]+(?:content|datetime)=["']([^"']+)["']/i,
  )?.[1];
  if (itemProp) return itemProp;
  const itemPropReversed = html.match(
    /<(?:meta|time)[^>]+(?:content|datetime)=["']([^"']+)["'][^>]+(?:itemprop|property|name)=["'](?:datePublished|article:published_time|publishdate)["']/i,
  )?.[1];
  if (itemPropReversed) return itemPropReversed;
  const text = extractTextContent(html);
  const monthName = text.match(
    /\b(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},\s+\d{4}\b/i,
  )?.[0];
  if (monthName) return monthName;
  const isoDate = text.match(/\b(?:19|20)\d{2}-\d{2}-\d{2}\b/)?.[0];
  if (isoDate) return isoDate;
  const chineseDate = text.match(/\b(?:19|20)\d{2}年\d{1,2}月\d{1,2}日\b/)?.[0];
  return chineseDate ?? "";
}

function extractTextContent(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractTagContent(html: string, tag: string): string {
  const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i");
  return regex.exec(html)?.[1]?.trim() ?? "";
}

function stripHtml(value: string): string {
  return value
    .replace(/<[^>]+>/g, " ")
    .replace(/&[a-z]+;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function decodeEntities(value: string): string {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, "/")
    .replace(/&nbsp;/g, " ");
}

function normalizeDate(value: string): { value: string; inferred: boolean } {
  if (!value) return { value: new Date().toISOString(), inferred: true };
  const chinese = value.match(/((?:19|20)\d{2})年(\d{1,2})月(\d{1,2})日/);
  const normalized = chinese
    ? `${chinese[1]}-${chinese[2]?.padStart(2, "0")}-${chinese[3]?.padStart(2, "0")}`
    : /^(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},\s+\d{4}$/i.test(
          value.trim(),
        )
      ? `${value.trim()} UTC`
      : value;
  const date = new Date(normalized);
  return Number.isNaN(date.getTime())
    ? { value: new Date().toISOString(), inferred: true }
    : { value: date.toISOString(), inferred: false };
}

function resolvePublicUrl(value: string, base: string): string | null {
  if (!value) return null;
  try {
    const url = new URL(value, base);
    return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function sha256Short(value: string): string {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    const char = value.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return Math.abs(hash).toString(16).padStart(8, "0");
}
