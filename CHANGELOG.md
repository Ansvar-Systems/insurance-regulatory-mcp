# Changelog

All notable changes to this project will be documented in this file.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Added
- `check_data_freshness` MCP tool reporting per-source staleness against
  expected refresh cadence and embedded `db_metadata.built_at` timestamp
- `db_metadata` table inside `data/insurance.db` with build provenance
  (`built_at`, `mcp_name`, `source_url`, per-table counts)
- `_error_type` discriminator on every error response
  (`validation_error` | `not_found` | `unknown_tool` | `internal_error`)
- Smoke test suite (`tests/smoke.test.ts`, 8 assertions) covering DB integrity,
  journal mode, metadata, FTS5 search, and `get_insurance_standard` lookup
- Security workflows: `semgrep.yml`, `trivy.yml`, `scorecard.yml`
- Open-source repo docs: `REGISTRY.md`, `CODE_OF_CONDUCT.md`,
  `CONTRIBUTING.md`, `CHANGELOG.md`, `CODEOWNERS`

### Changed
- Shipped database now uses `journal_mode=delete` so it travels as a single
  file (no `-wal`/`-shm` sidecars)
- `sources.yml`, server source URLs, and disclaimers point to the current
  `www.iais.org` domain (was the retired `www.iaisweb.org`)
- `_meta.data_age` is now derived from `db_metadata.built_at` when present

## [0.1.0] - 2026-04-14

### Added
- Initial release with IAIS Insurance Core Principles, Application Papers,
  ComFrame, Holistic Framework, plus a curated subset of NAIC Model Laws and
  Lloyd's Market Requirements
- Six MCP tools: `search_insurance_standards`, `get_insurance_standard`,
  `search_application_papers`, `list_insurance_frameworks`, `about`,
  `list_sources`
- Stdio entry point (`src/index.ts`) and Streamable HTTP entry point
  (`src/http-server.ts`)
- Multi-stage Dockerfile with non-root runtime user
- Ingestion pipeline: `ingest-fetch.ts` (HTTP + PDF parse), `build-db.ts`
  (FTS5 schema + ICP parser), `update-coverage.ts`, `check-freshness.ts`
- 67 rows committed: 8 frameworks, 28 controls (26 ICPs + 2 overview),
  31 circulars (Application Papers + supervisory material)
- Coverage manifest (`data/coverage.json`) and human-readable
  `COVERAGE.md` documenting NAIC auth-gate and Lloyd's JS-rendered gaps
