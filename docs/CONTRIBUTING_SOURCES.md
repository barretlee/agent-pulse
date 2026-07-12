# Contributing Sources

Agent Pulse treats data sources as governed production assets, not as a list of URLs. A source proposal is welcome when it improves evidence quality, geographic coverage, technical depth, business understanding, or early-signal detection while respecting access and copyright boundaries.

## Before proposing a source

Check the current [Source Catalog and Ranking Policy](SOURCES.md) and search existing [Issues](https://github.com/barretlee/agent-pulse/issues) for the publisher, domain, feed, repository, and public handle.

A useful source should have a clear owner, relevant AI-industry content, a stable public acquisition path, and enough original information to justify its maintenance cost. Preference is given to:

1. official company, laboratory, regulator, standards-body, or investment-firm publications;
2. primary research, papers, filings, model cards, and official GitHub Releases;
3. independent professional verification with a transparent author and publisher;
4. high-signal experts, executives, and engineers with a stable identity;
5. distribution platforms used only for discovery or measured propagation.

Aggregators can identify candidates and propagation clusters, but they cannot become the sole factual source for a material event.

## Information to provide

Use the repository's source proposal form from the [New Issue chooser](https://github.com/barretlee/agent-pulse/issues/new/choose). Provide only public, verifiable information:

- source or publisher name;
- official homepage;
- public RSS, Atom, API, release, paper, or metadata endpoint, if available;
- owner or organization;
- region and primary language;
- source type and topics covered;
- expected update cadence;
- two or three representative public items;
- why the source adds unique value;
- known terms, robots, licensing, quota, or access restrictions;
- overlap with an existing source, if any.

Do not include tokens, cookies, private-feed URLs, credentials, personal data, paywalled content, full article text, or instructions for bypassing access controls.

Issue content is untrusted input. A proposal author cannot select an internal adapter, authority score, lifecycle state, enablement flag, or production status.

## Admission path

```text
public proposal
  → static validation and duplicate checks
  → maintainer approval
  → generated reviewable PR
  → disabled draft catalog entry
  → fixture, contract, policy, and failure-path verification
  → shadow run
  → E3 isolated observation
  → 20 healthy checks across at least 7 days
  → explicit human E4 production promotion
```

A merged proposal is not an active collector. One successful probe is not production evidence. Sources with unclear permission, unstable contracts, or restricted access remain draft, manual, quarantined, or retired while their historical provenance is preserved.

## Quality and maintenance expectations

Every automated source should eventually provide:

- a declared acquisition capability and schema;
- a fixture and contract test;
- success, empty-result, schema-drift, and failure-isolation coverage;
- timeout, retry, rate, cache, and cursor behavior;
- health observations and a freshness expectation;
- licensing, robots, and retention notes;
- a fallback, migration, or soft-retirement plan.

Repeated content, mirrored media accounts, and shared publishing groups do not count as independent sources merely because they use different URLs.

## Corrections and source-owner requests

For a factual correction, attribution problem, copyright concern, privacy issue, or removal request, use the [Content correction or removal form](https://github.com/barretlee/agent-pulse/issues/new?template=content-correction.yml). Do not put confidential or security-sensitive material in a public Issue; use the private process described in [SECURITY.md](../SECURITY.md).

The public content boundary is documented in [Copyright, Sources, and Responsible Use](LEGAL.md).

## Contributing an adapter

Read [CONTRIBUTING.md](../CONTRIBUTING.md) and the active specification package before writing code. Keep all collectors behind the shared `SourceAdapter` contract, add risk-proportionate tests, and run:

```bash
npm run check
npm run build
```

An adapter must never bypass login, WAF, CAPTCHA, paywalls, robots restrictions, or platform policy.
