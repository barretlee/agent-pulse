# Data sources and ranking

## Source tiers

| Tier | Role | Examples | Default authority |
| --- | --- | --- | --- |
| 1 | Primary fact | Official blog, paper, filing, GitHub release | 85-100 |
| 2 | Professional verification | Reputable press, research institute | 65-85 |
| 3 | Expert interpretation | Researcher, CXO, engineer, newsletter | 50-80 |
| 4 | Distribution signal | X, Weibo, Reddit, HN, Zhihu | 20-60 |
| Aggregator | Discovery | AI HOT, HuggingNews | Never sole evidence |

## Heat is not credibility

`confidenceScore` answers “how likely is the factual core to be correct?”

`heatScore` answers “how broadly and quickly is this event spreading?”

A cross-circle hot event needs confidence, independent authors/sources, platform breadth, region breadth, velocity and persistence. Mirrored media accounts receive a repost penalty in future calibration.

## Initial adapters

- AI HOT public API (`selected` mode)
- OpenAI RSS
- Google DeepMind RSS
- Hugging Face RSS
- arXiv cs.AI RSS
- Hacker News RSS query
- Generic RSS / Atom
- Generic array JSON API
- HuggingNews public homepage metadata (disabled by default until a formal API/RSS exists)

## Source Catalog v0.3

The registry now contains 195 classified sources across 14 domains, adding model economics to frontier labs, China labs, research/evaluation, open source, agent/dev tools, robotics, chips/cloud/infra, capital/business, experts, media, policy, community heat and aggregators. 54 are China sources and 141 are global/overseas sources.

This is a discovery and maintenance catalog, not a claim that 195 collectors are production-ready:

- `ready` + `active`: contract is known and scheduled collection is allowed;
- `candidate` + `shadow`: stable-looking API/RSS/GitHub source awaiting fixtures and verification;
- `manual`: high-value official/expert source without a safe stable feed;
- `restricted`: social/platform source; metadata discovery only and disabled by default.

The canonical catalog is `src/catalog/sources.ts`; database rows add lifecycle, run-time health and verification evidence.

## Acquisition policy

- Identify the collector with a non-browser User-Agent.
- Follow API rate limits, fingerprint/ETag and caching contracts.
- Do not bypass login, WAF, CAPTCHA, paywalls or platform restrictions.
- Store metadata and provenance, not complete third-party articles.
- Respect correction/removal requests and disable unstable sources by default.

## Aggregator upstream protocol

AI HOT, HuggingNews, TLDR AI and similar products are discovery/heat sensors, never factual publishers. Their collector output is written to `source_discoveries`, not `signals`:

1. preserve the aggregator page as discovery evidence;
2. extract original URL, publisher name and public source handles;
3. match only an exact/prefix publisher URL, a unique identity host or an explicit social handle;
4. store unresolved identities as `candidate` or `heat_only`;
5. let the direct source collector create the factual signal;
6. merge aggregator metrics only when the canonical original URL matches.

An unresolved aggregator story cannot enter Event clustering. Aggregator authors/counts may affect heat, but never `independentSources` or factual confidence. Shared hosts such as `github.com` are never matched by hostname alone.

## Source lifecycle and operations

Sources move through `draft -> shadow -> active -> degraded -> quarantined -> retired`. Retire is a soft uninstall: historical provenance remains intact. Every execution creates a `source_runs` row with attempts, latency, counts, HTTP/error classification and response bytes.

The fetch layer supports bounded retries for network errors, 408/425/429 and 5xx, exponential backoff with jitter, `Retry-After`, ETag/Last-Modified, per-source timeout policy, manual redirect validation and streamed size limits. Scheduled batches use bounded concurrency and isolate failures by source.

Current limits are explicit: source-level rate policy is enforced inside one adapter run, but a global per-host token bucket and scheduler are not yet complete; adapter fixture coverage is still thin; AI HOT fingerprint polling is not yet implemented; HuggingNews remains an experimental HTML metadata adapter and its story page may expose handles without original post URLs.

## PriceAI boundary

[PriceAI](https://github.com/dimthink/PriceAI) is a valuable external model-purchase reference. Its data policy does not grant bulk reuse of production prices, channel lists, stock or snapshots. Agent Pulse links to the project with attribution and independently collects official vendor pages, Apple App Store regional subscription evidence and independent FX baselines; it does not mirror PriceAI production data.
