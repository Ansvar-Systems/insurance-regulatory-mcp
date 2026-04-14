# Contributing to insurance-regulatory-mcp

Thank you for your interest in contributing.

## How to Contribute

1. Fork the repository
2. Create a feature branch from `dev` (never push directly to `main`)
3. Make your changes
4. Run the build and tests: `npm run build && npm test`
5. Submit a pull request targeting `dev`

## Branch Strategy

```
feature-branch -> PR to dev -> verify on dev -> PR to main -> deploy
```

- All changes land on `dev` first
- `main` is production; only receives merges from `dev`
- PRs must pass all CI checks (typecheck, build, tests, semgrep, trivy) before merge

## Code Standards

- TypeScript strict mode (`strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`)
- All SQL queries must use parameterized statements
- All MCP tools must have a Zod schema for arguments and return `_meta` on success
- Errors must include an `_error_type` discriminator
- Run `npm run typecheck` before committing

## Data Ingestion

`scripts/ingest-fetch.ts` and `scripts/build-db.ts` are the supported way to
refresh the database. Hand-edited SQL or DB binaries are rejected. The
shipped database must be in `journal_mode=delete` so it travels as a single
file (no `-wal`/`-shm` sidecars).

## Reporting Issues

- Use GitHub Issues for bug reports and feature requests
- For security vulnerabilities, see [SECURITY.md](SECURITY.md)

## License

By contributing, you agree that your contributions will be licensed under the
project's [BSL-1.1](LICENSE) license, which converts to Apache-2.0 on
2030-04-13.
