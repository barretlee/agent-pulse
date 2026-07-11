import { describe, expect, it } from "vitest";
import { canonicalizeUrl, slugify } from "../src/domain/url.js";

describe("canonicalizeUrl", () => {
  it("removes tracking, fragments and redundant slashes", () => {
    expect(canonicalizeUrl("HTTPS://Example.COM/news/?utm_source=x&b=2&a=1#top")).toBe(
      "https://example.com/news?a=1&b=2",
    );
  });

  it("rejects non-http protocols", () => {
    expect(() => canonicalizeUrl("file:///etc/passwd")).toThrow("Unsupported URL protocol");
  });
});

describe("slugify", () => {
  it("creates stable readable slugs", () => {
    expect(slugify("GPT-5.6 发布：Agent 平台")).toBe("gpt-5-6-发布-agent-平台");
  });
});
