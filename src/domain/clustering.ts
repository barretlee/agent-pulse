const STOP_WORDS = new Set([
  "a",
  "an",
  "and",
  "for",
  "in",
  "of",
  "on",
  "the",
  "to",
  "update",
  "with",
]);

export function titleTokens(title: string): Set<string> {
  const tokens = title
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fff]+/g, " ")
    .split(/\s+/)
    .filter((token) => token.length > 1 && !STOP_WORDS.has(token));

  return new Set(tokens);
}

export function titleSimilarity(left: string, right: string): number {
  const a = titleTokens(left);
  const b = titleTokens(right);
  if (a.size === 0 || b.size === 0) return 0;
  let intersection = 0;
  for (const token of a) if (b.has(token)) intersection += 1;
  return intersection / (a.size + b.size - intersection);
}

export function belongsToEvent(
  candidate: { title: string; publishedAt: string },
  event: { title: string; happenedAt: string },
  threshold = 0.46,
): boolean {
  const hours =
    Math.abs(new Date(candidate.publishedAt).getTime() - new Date(event.happenedAt).getTime()) /
    3_600_000;
  return hours <= 96 && titleSimilarity(candidate.title, event.title) >= threshold;
}
