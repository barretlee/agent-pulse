<p align="right">
  <strong>English</strong> · <a href="README-zh-cn.md">简体中文</a>
</p>

<p align="center">
  <img src="docs/assets/hero.svg" width="100%" alt="Agent Pulse — evidence-backed AI industry intelligence" />
</p>

<h1 align="center">Agent Pulse</h1>

<p align="center">
  <strong>Signal, not noise.</strong><br />
  Evidence-backed AI industry intelligence for executives, investors, and builders — China-first, globally contextualized.
</p>

<p align="center">
  <a href="https://github.com/barretlee/agent-pulse/actions/workflows/ci.yml"><img src="https://img.shields.io/github/actions/workflow/status/barretlee/agent-pulse/ci.yml?branch=main&style=flat-square&label=CI" alt="CI status" /></a>
  <a href="https://github.com/barretlee/agent-pulse/actions/workflows/data-refresh.yml"><img src="https://img.shields.io/github/actions/workflow/status/barretlee/agent-pulse/data-refresh.yml?style=flat-square&label=data%20refresh" alt="Data refresh status" /></a>
  <a href="https://github.com/barretlee/agent-pulse/actions/workflows/source-audit.yml"><img src="https://img.shields.io/github/actions/workflow/status/barretlee/agent-pulse/source-audit.yml?style=flat-square&label=source%20audit" alt="Source audit status" /></a>
  <a href="https://github.com/barretlee/agent-pulse/releases/latest"><img src="https://img.shields.io/github/v/release/barretlee/agent-pulse?style=flat-square" alt="Latest release" /></a>
  <a href="https://github.com/barretlee/agent-pulse/stargazers"><img src="https://img.shields.io/github/stars/barretlee/agent-pulse?style=flat-square&logo=github" alt="GitHub stars" /></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/code%20license-MIT-2dd4a8?style=flat-square" alt="MIT code license" /></a>
</p>

<p align="center">
  <a href="https://barretlee.github.io/agent-pulse/"><strong>Explore live intelligence</strong></a>
  · <a href="https://github.com/barretlee/agent-pulse/stargazers"><strong>Star on GitHub</strong></a>
  · <a href="docs/ARCHITECTURE.md">Architecture</a>
  · <a href="docs/ROADMAP.md">Roadmap</a>
  · <a href="CHANGELOG.md">Changelog</a>
</p>

## Why Agent Pulse

The AI industry does not suffer from a shortage of links. It suffers from repeated reporting, mixed fact and opinion, platform-local hype, and disconnected technical, capital, policy, and commercial narratives.

Agent Pulse is not a news feed. It turns first-party releases, papers, filings, policy documents, expert analysis, and distribution signals into reviewable industry events. Every published event is designed to answer:

- What happened, and what is the original evidence?
- Why does it matter, and who does it affect?
- Which long-running industry narrative does it change?
- What should a CEO, investor, builder, or technology leader watch next?

```text
first-party facts + independent verification + distribution signals
                              │
                              ▼
      normalize → deduplicate → cluster → review → score
                              │
                              ▼
 technology / AGI / investment / commercialization / China / model economics
                              │
                              ▼
          industry judgment · next signals · actions · evidence
```

## Product

- **30-second decision brief** — the most decision-relevant recent event, with fact, importance, affected roles, next signal, and source links separated clearly.
- **Strategic narratives** — technology, AGI, commercialization, investment, China catch-up, and model economics are timelines with stages and inflection points, not ordinary tags.
- **Evidence timeline** — scan events chronologically, then inspect primary evidence, independent sources, system analysis, and confidence limitations.
- **China-first role radar** — follow model labs, cloud vendors, chip companies, developer ecosystems, and application leaders in the same global context.
- **Decision tools** — evidence-linked Scout opportunities, actor tracking, official model-access resources, capability accounting, and an honest evaluation center.
- **Control Room** — operate source health, collection, triage, event review, publication gates, model resources, Scout output, and static export without exposing the private admin system to GitHub Pages.

## Current, evidence-bound status

The project is approximately **Stage 1.9 / 5**, entering the Stage 2 foundation. The numbers below are a dated verification snapshot, not permanent marketing claims.

| Measure | Verified state on 2026-07-12 |
| --- | ---: |
| Classified source catalog | 258 |
| Healthy in the latest full audit | 131 |
| Strict real-time-effective sources | 104 |
| E3 isolated observation sources | 99 |
| E4 production canaries | 5, of which 4 were healthy in the evaluation snapshot |
| Published events | 44 |
| Published events with primary evidence | 36 |
| Published events with multiple independent sources | 4 |
| Calibrated system score | 30 / 100, raw 42, sufficient-evidence coverage 20% |

E0 catalog presence, E1 accessibility, E2 one-run validity, E3 isolated observation, and E4 production verification are deliberately different states. A large catalog or one successful request is not described as production coverage. See [Data Sources and Ranking](docs/SOURCES.md), the [Capability Map](docs/CAPABILITIES.md), and the machine-generated [source health report](data/reports/source-health-100.json).

Current limitations are explicit: most sources have not completed a seven-day production window; only four published events have independent multi-source evidence; claim-level evidence, multilingual semantic clustering, complete monthly backfill coverage, real MySQL CI, and user outcome feedback are still incomplete.

## Source and evidence policy

Agent Pulse prefers, in order:

1. official APIs, RSS/Atom feeds, filings, papers, and GitHub Releases;
2. official public JSON or stable metadata endpoints;
3. independent professional verification;
4. aggregators only for discovery and propagation clues;
5. low-frequency public-page metadata when robots, terms, and access boundaries allow it.

The system does not bypass logins, paywalls, CAPTCHAs, WAFs, or platform restrictions. Aggregators cannot be the sole factual evidence for a material event. New sources move through `draft → shadow → E3 observation → explicit human E4 promotion`; they do not become public facts directly from an Issue or a successful probe.

Read [Contributing Sources](docs/CONTRIBUTING_SOURCES.md) before proposing a source. Operational scoring and known adapter limitations are documented in [Data Sources and Ranking](docs/SOURCES.md).

## Architecture

```text
official sources / papers / filings / expert and propagation signals
                              │
                    SourceAdapter boundary
                              │
          fetch → normalize → quality gate → deduplicate
                              │
              deferred observation / event clustering
                              │
          evidence binding → review → publication readiness
                    ┌─────────┴─────────┐
                    ▼                   ▼
            private Control Room   privacy-safe static export
                                           │
                                      GitHub Pages
```

The default database is SQLite. A MySQL dialect path exists, but MySQL compatibility is not considered verified until it has real integration coverage. Public Pages contain only allowlisted static DTOs; the database, raw payloads, credentials, proxy configuration, and private notes are never exported.

More detail: [Architecture](docs/ARCHITECTURE.md) · [Capability Map](docs/CAPABILITIES.md) · [State 1–5 Roadmap](docs/ROADMAP.md)

## Quick start

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
- Control Room: <http://127.0.0.1:8899/admin/>
- Health endpoint: <http://127.0.0.1:8899/api/health>

Local development may run without `ADMIN_TOKEN`. Every non-development deployment must use a random token of at least 16 characters and keep the admin service private.

### Common commands

```bash
npm run dev                   # Start the local site and Control Room
npm run collect               # Collect, deduplicate, cluster, and score
npm run sources:audit         # Non-destructive full source audit
npm run monitor               # Generate source health and coverage output
npm run evolve -- --once      # Run one bounded, auditable evolution cycle
npm run export                # Generate the static site in dist/
npm run check                 # Lint, typecheck, tests, and export
npm run build                 # Compile server-side TypeScript
```

## Releases and evolution

- **v0.6.0 — The Intelligence Atlas:** introduced a high-density multipage experience, Issue-governed source proposals, serialized data writers, live repository metadata, and explicit content-rights boundaries.
- **v0.5.1 — Snapshot Parity:** restored source-health, run, evaluation, and public Scout parity across local, scheduled, and Pages builds.
- **v0.5.0 — The Evidence Engine:** expanded the source network, introduced isolated observation and reversible triage, recalibrated inflated evaluation scores, and rebuilt the public experience around primary evidence.

See the full [Changelog](CHANGELOG.md) and [GitHub Releases](https://github.com/barretlee/agent-pulse/releases). The roadmap separates planned, experimental, and operational capabilities; a design document or configured field is never counted as shipped behavior.

## Contributing

Contributions are welcome, especially source adapters, fixtures, failure-isolation tests, evidence-quality improvements, and clearer product explanations.

- Read [CONTRIBUTING.md](CONTRIBUTING.md) for code changes.
- Read [Contributing Sources](docs/CONTRIBUTING_SOURCES.md) for source proposals and corrections.
- Follow the [Code of Conduct](CODE_OF_CONDUCT.md).
- Report security issues privately as described in [SECURITY.md](SECURITY.md).

If Agent Pulse helps you understand the AI industry with less noise, [give the project a star](https://github.com/barretlee/agent-pulse/stargazers). It is a simple signal that the evidence-first approach is worth continuing.

## Copyright, responsible use, and license

The [MIT License](LICENSE) applies to Agent Pulse source code and original repository documentation unless a file states otherwise. It **does not** grant rights to third-party articles, papers, release notes, trademarks, images, feeds, or other source material. Original editorial analysis and exported intelligence content are not automatically licensed under MIT.

Public data should contain only necessary metadata, limited excerpts, source attribution, canonical links, and Agent Pulse's original synthesis. Source owners can request a correction, attribution change, or removal through the repository's content-correction Issue form. See [Copyright, Sources, and Responsible Use](docs/LEGAL.md) and [Third-Party Notices](THIRD_PARTY_NOTICES.md).

Agent Pulse provides research and decision-support information, not investment, legal, procurement, or other professional advice. Verify material decisions against the linked original sources.

[MIT](LICENSE) © 2026 Barret Lee
