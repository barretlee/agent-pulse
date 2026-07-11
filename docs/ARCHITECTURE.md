# Architecture

## Product boundary

Agent Pulse separates private operational state from public intelligence:

```text
Control plane (server-only)
  sources / raw signals / jobs / moderation / view composer
                           │
                           ▼ allowlist export
Public plane (static)
  timeline / tracks / actors / model resources / active view
```

The admin console is never exported to GitHub Pages.

## Data flow

```text
Source registry
  ├─ Tier 1: official facts
  ├─ Tier 2: professional verification
  ├─ Tier 3: expert interpretation
  ├─ Tier 4: social/community heat
  └─ Aggregators: discovery only
          │
          ▼
SourceAdapter -> CollectedSignal -> canonical URL + content hash
          │
          ▼
dedupe -> time/title/entity clustering -> Event
          │
          ├─ confidence score
          ├─ heat score
          ├─ impact score
          └─ value score
          │
          ▼
review / curation / track + actor composition
          │
          ▼
privacy-safe static export -> GitHub Pages
```

## Module map

| Path | Responsibility |
| --- | --- |
| `src/collectors/` | Adapter contract, RSS/API/aggregator adapters, network safety |
| `src/domain/` | Pure URL, clustering and scoring rules |
| `src/db/` | Kysely schema, migrations, repositories and seed catalog |
| `src/pipeline/` | Collection, clustering and static export orchestration |
| `src/server/` | Fastify public/admin API and security headers |
| `web/public/` | Framework-free static intelligence site |
| `web/admin/` | Local/server-side control room |
| `tests/` | Unit and SQLite integration tests |

## Database portability

SQLite is the zero-config default and enables WAL, foreign keys and a busy timeout. MySQL uses the same Kysely repository and migration definitions. JSON is stored as validated text to avoid dialect-specific JSON behavior; booleans use `0/1`; timestamps use UTC ISO-8601 text.

## Event as the single fact node

Tracks, actor roles, audience types and views never duplicate event facts. They attach narratives to a shared event through junction tables. This makes it possible to compare the same event across AGI, investment, To B and China catch-up perspectives without content drift.

## Failure model

- A failed source records health state but does not abort the batch.
- Duplicate URLs are skipped with a unique SHA-256 key.
- New automatic events enter `review`; they are not public by default.
- Manual score overrides are explicit and stop automatic rescoring.
- Static output is rebuilt from published rows only.

