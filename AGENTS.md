# AGENTS.md

## Project

Agent Pulse is a Chinese-first AI industry intelligence timeline. It collects high-value signals, clusters duplicate reports into events, scores both source credibility and cross-platform heat, and publishes concise analysis instead of raw feeds.

## Working agreements

- Keep product copy in Chinese; keep code, comments, commits, and technical docs in English unless a document is explicitly intended for Chinese review.
- Read `docs/specs/2026-07-11-agent-pulse-rebuild/` before changing architecture, schema, collection workflow, ranking, or publishing behavior.
- Keep collectors behind the shared `SourceAdapter` contract. Do not add source-specific logic to orchestration code.
- Treat aggregators as discovery or heat signals, never as the sole authority for a factual claim.
- Preserve provenance for every event and never publish raw third-party full text.
- Keep SQLite as the zero-config default and MySQL as a supported runtime through the same repository layer.
- Public output must remain static, privacy-safe, and deployable to GitHub Pages. The admin console is local/server-side only.
- Use `npm` in this repository because `tnpm` is not available in the current environment.
- Run `npm run check` before committing.

## Security and privacy

- Never commit `.env`, database files, tokens, cookies, private feeds, local paths, or raw collector payloads.
- Admin mutations require `ADMIN_TOKEN` outside development/test.
- Validate all external URLs and block loopback/private-network fetches unless a source is explicitly trusted in code.
- Sanitize imported text and render it as text, not HTML.

