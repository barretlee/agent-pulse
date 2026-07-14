import type { CatalogSource } from "./sources.js";

type CapitalFeedSeed = Pick<
  CatalogSource,
  "slug" | "name" | "homepageUrl" | "endpoint" | "region" | "language" | "topics"
>;

const seeds: CapitalFeedSeed[] = [
  {
    slug: "sequoia-ai",
    name: "Sequoia Capital",
    homepageUrl: "https://www.sequoiacap.com/articles/",
    endpoint: "https://sequoiacap.com/feed/",
    region: "US",
    language: "en",
    topics: ["venture-capital", "ai-company", "investment", "market"],
  },
  {
    slug: "menlo-ai",
    name: "Menlo Ventures",
    homepageUrl: "https://menlovc.com/perspective/",
    endpoint: "https://menlovc.com/feed/",
    region: "US",
    language: "en",
    topics: ["venture-capital", "ai-company", "enterprise", "consumer"],
  },
  {
    slug: "madrona-ventures",
    name: "Madrona",
    homepageUrl: "https://www.madrona.com/",
    endpoint: "https://www.madrona.com/feed/",
    region: "US",
    language: "en",
    topics: ["venture-capital", "ai-company", "enterprise", "cloud"],
  },
  {
    slug: "battery-ventures",
    name: "Battery Ventures",
    homepageUrl: "https://www.battery.com/",
    endpoint: "https://www.battery.com/feed/",
    region: "US",
    language: "en",
    topics: ["venture-capital", "ai-company", "enterprise", "infrastructure"],
  },
  {
    slug: "shunwei-capital",
    name: "顺为资本",
    homepageUrl: "https://shunwei.com/",
    endpoint: "https://shunwei.com/feed",
    region: "CN",
    language: "zh-CN",
    topics: ["venture-capital", "china", "ai-company", "robotics"],
  },
];

export const capitalEvidenceSources20260714: CatalogSource[] = seeds.map((seed) => ({
  ...seed,
  adapter: "rss",
  tier: 2,
  role: "expert",
  authorityScore: 78,
  qualityScore: 76,
  enabled: false,
  lifecycleStatus: "shadow",
  category: "capital-business",
  acquisition: "rss",
  maintenanceStatus: "candidate",
  cadence: "12h",
  licenseNote:
    "Official public feed metadata and short excerpts only; preserve provenance, link to the original, and never republish full article content.",
  identityHosts: [new URL(seed.homepageUrl).hostname],
}));
