import { describe, expect, it } from "vitest";
import { pageLayout, serializeJsonLd } from "../src/pipeline/static-site/render.js";

describe("static site SEO serialization", () => {
  it("keeps JSON-LD parseable while neutralizing script boundaries", () => {
    const value = {
      "@context": "https://schema.org",
      name: 'Evidence "quoted" </script><script>alert(1)</script>',
      separator: "line\u2028break",
    };
    const serialized = serializeJsonLd(value);

    expect(JSON.parse(serialized)).toEqual(value);
    expect(serialized).not.toContain("</script>");
    expect(serialized).not.toContain("<script>");
    expect(serialized).toContain("\\u003c");
  });

  it("renders valid page and custom structured-data blocks", () => {
    const html = pageLayout({
      title: "Test page · Agent Pulse",
      description: "A unique test description.",
      route: "/events/test/",
      depth: 2,
      active: "timeline",
      body: "<article><h1>Test</h1></article>",
      siteUrl: "https://example.com/agent-pulse/",
      github: {
        repositoryUrl: "https://github.com/barretlee/agent-pulse",
        stars: 1,
        forks: 0,
        openIssues: 0,
        latestRelease: "v0.11.0",
        fetchedAt: "2026-07-14T00:00:00.000Z",
      },
      generatedAt: "2026-07-14T00:00:00.000Z",
      locale: "zh-CN",
      ogType: "article",
      jsonLd: [{ "@context": "https://schema.org", "@type": "Article", headline: "Test" }],
    });
    const blocks = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];

    expect(blocks).toHaveLength(2);
    expect(blocks.map((block) => JSON.parse(block[1] ?? ""))).toMatchObject([
      { "@type": "WebPage" },
      { "@type": "Article", headline: "Test" },
    ]);
    expect(html).toContain('<meta property="og:type" content="article">');
    expect(html).toContain('<meta name="twitter:card" content="summary">');
  });
});
