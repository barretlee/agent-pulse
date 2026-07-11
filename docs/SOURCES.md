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

## Acquisition policy

- Identify the collector with a non-browser User-Agent.
- Follow API rate limits, fingerprint/ETag and caching contracts.
- Do not bypass login, WAF, CAPTCHA, paywalls or platform restrictions.
- Store metadata and provenance, not complete third-party articles.
- Respect correction/removal requests and disable unstable sources by default.

## PriceAI boundary

[PriceAI](https://github.com/dimthink/PriceAI) is a valuable external model-purchase reference. Its data policy does not grant bulk reuse of production prices, channel lists, stock or snapshots. Agent Pulse links to the project with attribution and independently collects official vendor price baselines; it does not mirror PriceAI production data.

