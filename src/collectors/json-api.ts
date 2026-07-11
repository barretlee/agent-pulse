import type { SourceAdapter } from "./types.js";

export const jsonApiAdapter: SourceAdapter = {
  kind: "json-api",
  async collect(source, context) {
    const { body } = await context.fetchText(source.config.url);
    const payload = JSON.parse(body) as unknown;
    if (!Array.isArray(payload)) throw new Error("json-api adapter expects an array payload");
    return payload.slice(0, source.config.take ?? 50).map((item, index) => {
      if (!isRecord(item) || typeof item.url !== "string" || typeof item.title !== "string") {
        throw new Error(`Invalid JSON item at index ${index}`);
      }
      return {
        externalId: typeof item.id === "string" ? item.id : item.url,
        url: item.url,
        title: item.title,
        summary: typeof item.summary === "string" ? item.summary : item.title,
        language: source.language,
        publishedAt: validDate(item.publishedAt),
        category:
          typeof item.category === "string"
            ? item.category
            : (source.config.category ?? "industry"),
        tags: Array.isArray(item.tags)
          ? item.tags.filter((value): value is string => typeof value === "string")
          : [],
        metrics: {},
        rawMeta: {},
      };
    });
  },
};

function validDate(value: unknown): string {
  const date = new Date(typeof value === "string" ? value : Date.now());
  return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
