<p align="right">
  <strong>English</strong> · <a href="README-zh-cn.md">简体中文</a>
</p>

<p align="center">
  <img src="docs/assets/hero.svg" width="100%" alt="Agent Pulse — evidence-backed AI industry intelligence" />
</p>

<h1 align="center">Agent Pulse</h1>

> **Agent Pulse is an AI industry intelligence and decision system for investors, executives, founders, and technical leaders, turning official releases, research papers, capital moves, policy changes, and community signals into evidence-backed events, strategic judgments, and next actions.**

<p align="center">
  <a href="https://barretlee.github.io/agent-pulse/"><strong>Open Agent Pulse</strong></a>
  · <a href="https://github.com/barretlee/agent-pulse"><strong>⭐ Star this repository</strong></a>
  · <a href="README-zh-cn.md"><strong>Read in Chinese</strong></a>
</p>

<p align="center">
  <a href="https://github.com/barretlee/agent-pulse/actions/workflows/ci.yml"><img src="https://img.shields.io/github/actions/workflow/status/barretlee/agent-pulse/ci.yml?branch=main&style=flat-square&label=CI" alt="CI status" /></a>
  <a href="https://github.com/barretlee/agent-pulse/actions/workflows/data-refresh.yml"><img src="https://img.shields.io/github/actions/workflow/status/barretlee/agent-pulse/data-refresh.yml?style=flat-square&label=data%20refresh" alt="Data refresh status" /></a>
  <a href="https://github.com/barretlee/agent-pulse/actions/workflows/source-audit.yml"><img src="https://img.shields.io/github/actions/workflow/status/barretlee/agent-pulse/source-audit.yml?style=flat-square&label=source%20audit" alt="Source audit status" /></a>
  <a href="https://github.com/barretlee/agent-pulse/releases/latest"><img src="https://img.shields.io/github/v/release/barretlee/agent-pulse?style=flat-square" alt="Latest release" /></a>
  <a href="https://github.com/barretlee/agent-pulse"><img src="https://img.shields.io/github/stars/barretlee/agent-pulse?style=flat-square&logo=github" alt="GitHub stars" /></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/code%20license-MIT-2dd4a8?style=flat-square" alt="MIT code license" /></a>
</p>

## Why people star Agent Pulse

AI has no shortage of news, feeds, or hot takes. What is scarce is a reliable way to understand what changed, why it matters, how it connects to a longer industry shift, and what to watch next.

Agent Pulse is built for that job:

- **30 seconds:** see the few changes that matter today;
- **3 minutes:** understand the evidence, context, and affected players;
- **10 minutes:** form a judgment through the event history, counter-signals, and next checkpoints;
- **Every day:** follow technology, AGI, commercialization, investment, China, and model economics as evolving narratives rather than disconnected headlines.

If you want an open, evidence-first alternative to AI news overload, [star Agent Pulse](https://github.com/barretlee/agent-pulse). A star helps more decision-makers and builders discover the project, and tells us this public intelligence layer is worth maintaining.

## What you get

| Product experience | The question it answers |
| --- | --- |
| **Today's brief** | What changed today, and what deserves my attention first? |
| **Strategic narratives** | Is this a one-off announcement or part of a durable industry shift? |
| **Evidence timeline** | What happened first, what changed later, and which claims are verified? |
| **Research frontier** | Which papers change technical capability, evaluation, cost, or product direction? |
| **China and global radar** | Who is leading, catching up, constrained, or expanding internationally? |
| **Scout opportunities** | What product, company, content, or internal experiment is worth validating now? |

[Explore the live product →](https://barretlee.github.io/agent-pulse/)

## Not another news aggregator

Every public event is designed to separate six layers:

1. **Fact** — what happened and when;
2. **Evidence** — the original release, paper, filing, or policy document;
3. **Context** — what came before and what actually changed;
4. **Impact** — who is affected across technology, business, capital, and policy;
5. **Judgment** — the current interpretation, with uncertainty made explicit;
6. **Next signal** — what would strengthen, weaken, or invalidate the judgment.

```text
official releases + papers + filings + expert and propagation signals
                                │
                                ▼
       collect → normalize → deduplicate → cluster → evidence binding
                                │
                                ▼
     deterministic gate → strategic narrative → next signal → public event
```

Aggregators can suggest candidates or propagation heat, but cannot become the sole factual evidence for a material event. External text is never treated as trusted HTML, and private operational data never enters the public static export.

## Live, auditable, and honest about its limits

The repository is not a mockup. It contains the source catalog, collectors, evidence model, automatic quality gates, static renderer, source-health automation, and GitHub Pages delivery path used by the live product.

Verification snapshot captured at **2026-07-13 00:27 UTC**:

| Measure | Verified state |
| --- | ---: |
| Monitored sources | 260 |
| Healthy in that full audit | 139 |
| Isolated observation sources | 107 |
| Production sources | 5 |
| Published evidence-backed events | 50 |
| Normalized direct signals in the repository snapshot | 1,959 |

See the machine-generated [source health report](data/reports/source-health.json), [data-source policy](docs/SOURCES.md), and [capability map](docs/CAPABILITIES.md).

The limitations are equally important: production qualification still needs a real observation window; many historical events need more independent evidence; claim-level evidence, multilingual semantic clustering, real MySQL integration coverage, and user outcome feedback are still incomplete. Planned or experimental capabilities are never presented as shipped.

## Architecture

```text
sources and discovery signals
          │
   SourceAdapter boundary
          │
safe fetch → normalize → quality gate → deduplicate
          │
isolated observation / event clustering
          │
evidence binding → deterministic readiness gate
          │
     ┌────┴────┐
     ▼         ▼
Control Room   privacy-safe static site → GitHub Pages
```

SQLite is the zero-configuration default. A MySQL dialect path exists, but the project does not claim MySQL compatibility without real integration coverage. Public Pages contain only allowlisted DTOs; databases, credentials, raw payloads, proxy settings, and private notes are excluded.

Read the [architecture](docs/ARCHITECTURE.md), [roadmap](docs/ROADMAP.md), or [changelog](CHANGELOG.md) for implementation details and release history.

## Run locally

Requires Node.js 22 or later.

```bash
git clone https://github.com/barretlee/agent-pulse.git
cd agent-pulse
npm install
cp .env.example .env
npm run db:migrate
npm run db:seed
npm run dev
```

Open:

- Public site: <http://127.0.0.1:8899/>
- Private Control Room: <http://127.0.0.1:8899/admin/>
- Health endpoint: <http://127.0.0.1:8899/api/health>

Useful commands:

```bash
npm run collect               # Collect, deduplicate, cluster, and score
npm run sources:audit         # Run a non-destructive full source audit
npm run ops:reconcile         # Reconcile source health and discovery state
npm run scout:generate -- 5   # Publish or archive evidence-linked Scout opportunities
npm run export                # Generate the static site in dist/
npm run check                 # Lint, typecheck, tests, and static export
```

Local development can run without `ADMIN_TOKEN`. Any non-development deployment must use a strong token and keep the Control Room behind private access controls.

## Contribute

High-leverage contributions include stable source adapters, parser fixtures, paper and benchmark coverage, evidence-quality improvements, failure-isolation tests, and clearer product explanations.

- Code changes: [CONTRIBUTING.md](CONTRIBUTING.md)
- Source proposals and corrections: [Contributing Sources](docs/CONTRIBUTING_SOURCES.md)
- Community rules: [Code of Conduct](CODE_OF_CONDUCT.md)
- Private security reports: [SECURITY.md](SECURITY.md)

If Agent Pulse helps you replace information overload with clearer judgment, [⭐ star the repository](https://github.com/barretlee/agent-pulse) and share the one-sentence description at the top.

## License and responsible use

The [MIT License](LICENSE) applies to Agent Pulse source code and original repository documentation unless a file states otherwise. It does not grant rights to third-party articles, papers, release notes, trademarks, images, feeds, or other source material. Public intelligence output contains limited metadata, attribution, canonical links, and Agent Pulse's original synthesis.

Read [Copyright, Sources, and Responsible Use](docs/LEGAL.md) and [Third-Party Notices](THIRD_PARTY_NOTICES.md). Agent Pulse provides research and decision-support information, not investment, legal, procurement, or other professional advice.

[MIT](LICENSE) © 2026 Barret Lee
