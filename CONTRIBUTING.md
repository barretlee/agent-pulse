# Contributing

Thanks for helping make AI industry intelligence more useful and less noisy.

## Before opening a PR

1. Read `AGENTS.md` and the active spec package under `docs/specs/`.
2. Open an issue before schema, ranking, workflow or public information-architecture changes.
3. Keep collectors behind the `SourceAdapter` contract.
4. Never add a source that requires bypassing access controls.
5. Do not commit private data, tokens, cookies, raw payload dumps or database files.

## Development

```bash
npm install
npm run db:migrate
npm run db:seed
npm run check
```

## Pull request checklist

- Tests cover the new behavior or bug fix.
- New source metadata includes tier, role, region, language, authority and acquisition method.
- Public output remains static and privacy-safe.
- Facts, inferences and heat signals remain distinguishable.
- Documentation is updated if behavior or operator workflow changes.

Code, comments and commits should be in English. Product copy may be Chinese.

