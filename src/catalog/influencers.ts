export type InfluencerPlatform = "website" | "x" | "linkedin" | "weibo" | "jike" | "github";

export interface InfluencerProfile {
  platform: InfluencerPlatform;
  handle: string;
  url: string;
  access: "automatic" | "restricted";
}

export interface InfluencerCatalogEntry {
  slug: string;
  name: string;
  region: "CN" | "GLOBAL";
  focus: string[];
  feedSourceSlug?: string;
  profiles: InfluencerProfile[];
}

export const influencerCatalog: readonly InfluencerCatalogEntry[] = [
  {
    slug: "andrej-karpathy",
    name: "Andrej Karpathy",
    region: "GLOBAL",
    focus: ["AI education", "LLM engineering", "agents"],
    profiles: [
      {
        platform: "website",
        handle: "karpathy.ai",
        url: "https://karpathy.ai/",
        access: "restricted",
      },
      { platform: "x", handle: "karpathy", url: "https://x.com/karpathy", access: "restricted" },
    ],
  },
  {
    slug: "andrew-ng",
    name: "Andrew Ng",
    region: "GLOBAL",
    focus: ["AI education", "applications", "investment"],
    profiles: [
      { platform: "x", handle: "AndrewYNg", url: "https://x.com/AndrewYNg", access: "restricted" },
      {
        platform: "linkedin",
        handle: "andrewyng",
        url: "https://www.linkedin.com/in/andrewyng/",
        access: "restricted",
      },
    ],
  },
  {
    slug: "simon-willison",
    name: "Simon Willison",
    region: "GLOBAL",
    focus: ["LLM engineering", "AI coding", "open source"],
    feedSourceSlug: "simon-willison",
    profiles: [
      {
        platform: "website",
        handle: "simonwillison.net",
        url: "https://simonwillison.net/",
        access: "automatic",
      },
      { platform: "x", handle: "simonw", url: "https://x.com/simonw", access: "restricted" },
    ],
  },
  {
    slug: "chip-huyen",
    name: "Chip Huyen",
    region: "GLOBAL",
    focus: ["ML systems", "AI infrastructure", "product"],
    feedSourceSlug: "chip-huyen",
    profiles: [
      {
        platform: "website",
        handle: "huyenchip.com",
        url: "https://huyenchip.com/blog/",
        access: "automatic",
      },
      { platform: "x", handle: "chipro", url: "https://x.com/chipro", access: "restricted" },
      {
        platform: "linkedin",
        handle: "chiphuyen",
        url: "https://www.linkedin.com/in/chiphuyen/",
        access: "restricted",
      },
    ],
  },
  {
    slug: "lilian-weng",
    name: "Lilian Weng",
    region: "GLOBAL",
    focus: ["agents", "alignment", "research synthesis"],
    feedSourceSlug: "lilian-weng",
    profiles: [
      {
        platform: "website",
        handle: "Lil'Log",
        url: "https://lilianweng.github.io/",
        access: "automatic",
      },
      {
        platform: "x",
        handle: "lilianweng",
        url: "https://x.com/lilianweng",
        access: "restricted",
      },
    ],
  },
  {
    slug: "eugene-yan",
    name: "Eugene Yan",
    region: "GLOBAL",
    focus: ["AI products", "recommendation", "ML systems"],
    feedSourceSlug: "eugene-yan",
    profiles: [
      {
        platform: "website",
        handle: "eugeneyan.com",
        url: "https://eugeneyan.com/",
        access: "automatic",
      },
      {
        platform: "linkedin",
        handle: "eugeneyan",
        url: "https://www.linkedin.com/in/eugeneyan/",
        access: "restricted",
      },
    ],
  },
  {
    slug: "nathan-lambert",
    name: "Nathan Lambert",
    region: "GLOBAL",
    focus: ["open models", "post-training", "AI policy"],
    feedSourceSlug: "interconnects",
    profiles: [
      {
        platform: "website",
        handle: "Interconnects",
        url: "https://www.interconnects.ai/",
        access: "automatic",
      },
      {
        platform: "x",
        handle: "natolambert",
        url: "https://x.com/natolambert",
        access: "restricted",
      },
    ],
  },
  {
    slug: "swyx",
    name: "swyx",
    region: "GLOBAL",
    focus: ["AI engineering", "agents", "developer ecosystem"],
    feedSourceSlug: "latent-space",
    profiles: [
      {
        platform: "website",
        handle: "Latent Space",
        url: "https://www.latent.space/",
        access: "automatic",
      },
      { platform: "x", handle: "swyx", url: "https://x.com/swyx", access: "restricted" },
    ],
  },
  {
    slug: "baoyu",
    name: "宝玉",
    region: "CN",
    focus: ["AI coding", "prompt engineering", "product practice"],
    feedSourceSlug: "baoyu",
    profiles: [
      { platform: "website", handle: "baoyu.io", url: "https://baoyu.io/", access: "automatic" },
      { platform: "x", handle: "dotey", url: "https://x.com/dotey", access: "restricted" },
      { platform: "github", handle: "dotey", url: "https://github.com/dotey", access: "automatic" },
    ],
  },
  {
    slug: "mu-li",
    name: "李沐",
    region: "CN",
    focus: ["deep learning", "AI education", "systems research"],
    feedSourceSlug: "mu-li-blog",
    profiles: [
      {
        platform: "website",
        handle: "Mu's Blog",
        url: "https://mli.github.io/",
        access: "automatic",
      },
      { platform: "github", handle: "mli", url: "https://github.com/mli", access: "automatic" },
    ],
  },
  {
    slug: "guizang",
    name: "歸藏",
    region: "CN",
    focus: ["AI products", "AI design", "AI coding"],
    profiles: [
      { platform: "x", handle: "op7418", url: "https://x.com/op7418", access: "restricted" },
      {
        platform: "github",
        handle: "op7418",
        url: "https://github.com/op7418",
        access: "automatic",
      },
    ],
  },
  {
    slug: "kai-fu-lee",
    name: "李开复",
    region: "CN",
    focus: ["AI investment", "industry strategy", "China market"],
    profiles: [
      { platform: "x", handle: "kaifulee", url: "https://x.com/kaifulee", access: "restricted" },
      {
        platform: "linkedin",
        handle: "kaifulee",
        url: "https://www.linkedin.com/in/kaifulee/",
        access: "restricted",
      },
      {
        platform: "weibo",
        handle: "kaifulee",
        url: "https://weibo.com/kaifulee",
        access: "restricted",
      },
    ],
  },
] as const;
