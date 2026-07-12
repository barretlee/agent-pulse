import type { CollectedSignal } from "../domain/types.js";
import type { SourceAdapter } from "./types.js";

/**
 * GitHub Releases adapter.
 *
 * Collects release notes from GitHub repositories via the public Atom feed:
 *   https://github.com/<owner>/<repo>/releases.atom
 *
 * Accepts either the Atom URL directly, or the repo homepage URL
 * (the adapter auto-appends `/releases.atom`).
 */
export const githubReleasesAdapter: SourceAdapter = {
  kind: "github-releases",
  async collect(source, context) {
    const feedUrl = resolveFeedUrl(source.config.url);
    const { body, status } = await context.fetchText(feedUrl);
    if (status === 304) return [];

    const entries = extractEntries(body);
    if (entries.length === 0) {
      throw new Error(`GitHub Releases: no entries found in feed ${feedUrl}`);
    }

    return entries
      .slice(0, source.config.take ?? 20)
      .map((entry) => normalizeEntry(entry, source.language, source.config.category));
  },
};

function resolveFeedUrl(url: string): string {
  const trimmed = url.replace(/\/+$/, "");
  if (trimmed.endsWith("/releases.atom")) return trimmed;
  if (trimmed.endsWith("/releases")) return `${trimmed}.atom`;
  // Try to detect owner/repo pattern
  const match = trimmed.match(/^https:\/\/github\.com\/([^/]+\/[^/]+)$/i);
  if (match) return `https://github.com/${match[1]}/releases.atom`;
  if (/^https:\/\/github\.com\/[^/]+$/i.test(trimmed)) {
    throw new Error("GitHub Releases: source URL is an organization or user, not a repository");
  }
  return `${trimmed}/releases.atom`;
}

interface ReleaseEntry {
  id: string;
  title: string;
  link: string;
  published: string;
  updated: string;
  summary: string;
  author: string;
}

function extractEntries(xml: string): ReleaseEntry[] {
  const entries: ReleaseEntry[] = [];
  // Match <entry>...</entry> blocks
  const entryRegex = /<entry>([\s\S]*?)<\/entry>/g;
  for (const match of xml.matchAll(entryRegex)) {
    const block = match[1] ?? "";
    const entry: ReleaseEntry = {
      id: extractTag(block, "id"),
      title: extractTag(block, "title"),
      link: extractLink(block),
      published: extractTag(block, "published"),
      updated: extractTag(block, "updated"),
      summary: extractTag(block, "summary") || extractTag(block, "content"),
      author: extractTag(block, "name") || extractAuthor(block),
    };
    if (entry.title && entry.link) entries.push(entry);
  }
  return entries;
}

function extractTag(xml: string, tag: string): string {
  const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i");
  const match = xml.match(regex);
  if (!match?.[1]) return "";
  return stripHtml(decodeEntities(match[1].trim()));
}

function extractLink(xml: string): string {
  // Try <link href="..."> (Atom) or <link>...</link> (RSS)
  const hrefMatch = xml.match(/<link[^>]+href="([^"]+)"/i);
  if (hrefMatch?.[1]) return hrefMatch[1];
  return extractTag(xml, "link");
}

function extractAuthor(xml: string): string {
  const emailMatch = xml.match(/<email>([^<]+)<\/email>/i);
  if (emailMatch?.[1]) return emailMatch[1];
  const uriMatch = xml.match(/<uri>([^<]+)<\/uri>/i);
  return uriMatch?.[1] ?? "";
}

function normalizeEntry(
  entry: ReleaseEntry,
  language: string,
  fallbackCategory?: string,
): CollectedSignal {
  const published = validDate(entry.published) ?? validDate(entry.updated);
  const publishedAt = published ?? new Date().toISOString();

  return {
    externalId: entry.id,
    url: entry.link,
    title: entry.title,
    summary: entry.summary.slice(0, 8_000),
    ...(entry.author ? { author: entry.author } : {}),
    language,
    publishedAt,
    category: fallbackCategory ?? "open-source",
    tags: ["release", "github", "open-source"],
    metrics: { platforms: ["github"] },
    rawMeta: {
      adapter: "github-releases",
      entryId: entry.id,
      dateInferred: published === null,
    },
  };
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
    .replace(/&#x2F;/g, "/");
}

function validDate(value: string): string | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}
