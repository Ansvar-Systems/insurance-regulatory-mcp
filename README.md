# Insurance Regulatory Intelligence MCP

> Structured access to international insurance supervisory standards: IAIS Insurance Core Principles, Application Papers, ComFrame, the Holistic Framework, selected NAIC Model Laws, and Lloyd's Market Requirements.

[![npm](https://img.shields.io/npm/v/@ansvar/insurance-regulatory-mcp)](https://www.npmjs.com/package/@ansvar/insurance-regulatory-mcp)
[![License](https://img.shields.io/badge/license-BSL--1.1-blue.svg)](LICENSE)
[![CI](https://github.com/Ansvar-Systems/insurance-regulatory-mcp/actions/workflows/ci.yml/badge.svg)](https://github.com/Ansvar-Systems/insurance-regulatory-mcp/actions/workflows/ci.yml)

Part of the [Ansvar](https://ansvar.eu) regulatory intelligence platform. **Premium-enabled:** full access requires an Ansvar premium subscription.

## Quick Start

### Remote (Hetzner)

Use the hosted endpoint — no installation needed:

**Claude Desktop** (`claude_desktop_config.json`):
```json
{
  "mcpServers": {
    "insurance-regulatory": {
      "url": "https://mcp.ansvar.eu/intl/insurance-regulatory/mcp"
    }
  }
}
```

**Cursor / VS Code** (`.cursor/mcp.json` or `.vscode/mcp.json`):
```json
{
  "servers": {
    "insurance-regulatory": {
      "url": "https://mcp.ansvar.eu/intl/insurance-regulatory/mcp"
    }
  }
}
```

For authenticated premium access across the Ansvar fleet, use the gateway at `https://gateway.ansvar.eu`.

### Local (npm)

Run entirely on your machine:

```bash
npx @ansvar/insurance-regulatory-mcp
```

**Claude Desktop** (`claude_desktop_config.json`):
```json
{
  "mcpServers": {
    "insurance-regulatory": {
      "command": "npx",
      "args": ["-y", "@ansvar/insurance-regulatory-mcp"]
    }
  }
}
```

### Docker

```bash
docker pull ghcr.io/ansvar-systems/insurance-regulatory-mcp:latest
docker run -p 8383:8383 ghcr.io/ansvar-systems/insurance-regulatory-mcp:latest
# MCP endpoint: http://localhost:8383/mcp
# Health:       http://localhost:8383/health
```

The Docker image uses Streamable HTTP transport on port 8383 at `/mcp`.

## What's Included

| Framework | Items | Version | Completeness |
|-----------|-------|---------|--------------|
| IAIS Insurance Core Principles (ICPs) | 26 | December 2024 (ICP-26 from 2018 revision) | Full |
| IAIS Application Papers | 14 | Current (2018–2026, final adopted) | Full |
| IAIS Supervisory Material (peer reviews, issues papers, climate guidance) | 17 | Current | Full |
| ComFrame | Integrated with ICPs | 2019 revision + updates | Full |
| IAIS Holistic Framework (systemic risk + ICS) | Overview | Current | Overview only |
| NAIC Model Laws | 0 (auth-gated — excluded) | — | Pending credentials |
| Lloyd's Market Bulletins | 0 (JS-rendered — excluded) | — | Pending headless fetch |

**Total: 8 frameworks, 28 controls (26 ICPs + 2 framework-overview rows), 31 circulars (IAIS Application Papers + supervisory material).**

**Frameworks indexed:**

| ID | Name | Authority |
|----|------|-----------|
| `iais-icp` | IAIS Insurance Core Principles | International Association of Insurance Supervisors |
| `iais-ap` | IAIS Application Papers | IAIS |
| `iais-comframe` | ComFrame (Common Framework for IAIGs) | IAIS |
| `iais-holistic` | IAIS Holistic Framework (systemic risk + ICS) | IAIS |
| `naic-models` | NAIC Model Laws (cyber, data, privacy subset) | National Association of Insurance Commissioners |
| `lloyds-min` | Lloyd's Minimum Standards (managing agents, cyber underwriting) | Lloyd's of London |

## What's NOT Included

- **NAIC Model Laws** — `content.naic.org/cipr_topics/` returns HTTP 403 to unauthenticated clients; most model-law PDFs sit behind member registration. We do not bypass authentication. Premium customers may supply their own credentials in a future iteration.
- **Lloyd's Market Bulletins** — `www.lloyds.com/market-resources/market-bulletins` is reachable but the bulletin listing is rendered client-side via JavaScript and no public JSON feed is exposed. Reliable capture requires a headless-browser pass or the official bulletin subscription feed.
- **Non-English publications** — Translations skipped to avoid duplicate ICP entries.
- **National implementation of international standards** (Solvency II, RBC, national insurance codes) — covered by separate jurisdiction MCPs.
- **Court decisions on insurance regulation** — legal analysis is out of scope.
- **Confidential supervisory letters** — not publicly available.
- **Draft / consultation papers** — only finalised standards indexed.

See [COVERAGE.md](COVERAGE.md) for the full per-source breakdown and ICP-level coverage detail.

## Installation

### npm (stdio transport)

```bash
npm install @ansvar/insurance-regulatory-mcp
```

Add to your MCP client configuration:

```json
{
  "mcpServers": {
    "insurance-regulatory": {
      "command": "npx",
      "args": ["-y", "@ansvar/insurance-regulatory-mcp"]
    }
  }
}
```

### Docker (HTTP transport)

```bash
docker pull ghcr.io/ansvar-systems/insurance-regulatory-mcp:latest
docker run -p 8383:8383 ghcr.io/ansvar-systems/insurance-regulatory-mcp:latest
```

### Hosted

- Public MCP: `https://mcp.ansvar.eu/intl/insurance-regulatory/mcp`
- Gateway (OAuth, multi-MCP, premium): `https://gateway.ansvar.eu`

## Tools

7 tools are available. See [TOOLS.md](TOOLS.md) for full parameter documentation.

| Tool | Description |
|------|-------------|
| `search_insurance_standards` | Full-text search across ICPs, Application Papers, NAIC, and Lloyd's |
| `get_insurance_standard` | Look up a standard by reference ID (e.g., `ICP-16`, `AP-CYBER-2023`) |
| `search_application_papers` | Search IAIS Application Papers with optional framework/domain filters |
| `list_insurance_frameworks` | List all frameworks with version, authority, and standard counts |
| `about` | Server metadata, version, and coverage summary |
| `list_sources` | Data provenance: sources, retrieval method, update frequency, licensing |
| `check_data_freshness` | Per-source `last_fetched` date, staleness, and Current / Due / OVERDUE status |

Every successful response includes a `_meta` object with `disclaimer`, `data_age`, and `source_url`. `get_insurance_standard` also includes a `_citation` object with `canonical_ref` and `display_text`. Error responses include `_error_type` (`validation_error` | `not_found` | `unknown_tool` | `internal_error`).

## Example Queries

```
# Search for capital adequacy guidance across all frameworks
search_insurance_standards(query="capital adequacy enterprise risk management", limit=10)

# Fetch the specific ICP on Enterprise Risk Management
get_insurance_standard(standard_id="ICP-16")

# Find cyber-risk application papers
search_application_papers(query="cyber risk underwriting", framework="iais-ap", limit=5)

# Enumerate all covered frameworks with counts
list_insurance_frameworks()

# Check freshness before relying on time-sensitive guidance
check_data_freshness()
```

## Development

```bash
git clone https://github.com/Ansvar-Systems/insurance-regulatory-mcp.git
cd insurance-regulatory-mcp
npm install
npm run build        # Compile TypeScript
npm run seed         # Create sample database for development
npm test             # Run Vitest smoke + contract tests
npm run dev          # Start HTTP dev server on port 8383 with hot reload
```

### Full ingestion (requires live portal access)

```bash
npm run ingest:full   # fetch -> build:db -> coverage:update
```

Subcommands: `npm run ingest:fetch`, `npm run ingest:diff`, `npm run build:db`, `npm run coverage:update`, `npm run freshness:check`.

Branching: `feature/* -> dev -> main`. Direct pushes to `main` are blocked by branch protection.

See [CONTRIBUTING.md](CONTRIBUTING.md) for the full contribution guide.

## Authority

**International Association of Insurance Supervisors (IAIS)**
Global standard-setter for insurance supervision
https://www.iais.org

The IAIS is the global body setting insurance supervisory standards, hosted by the Bank for International Settlements in Basel. Its Insurance Core Principles (ICPs) and ComFrame form the baseline framework that national regulators around the world implement; Application Papers provide supervisory guidance on cross-cutting topics (cyber, climate, AI, conduct, ESG). Supplementary standards from the **National Association of Insurance Commissioners (NAIC)** (US state-level) and **Lloyd's of London** (specialty market) are indexed where publicly available.

## License

BSL-1.1. See [LICENSE](LICENSE). Converts to Apache-2.0 on 2030-04-13.

## Disclaimer

This server provides informational reference data only. It does not constitute legal, regulatory, or professional advice. NAIC and Lloyd's content coverage is partial due to access restrictions documented above. Always verify against the authoritative IAIS, NAIC, and Lloyd's publications and engage qualified compliance professionals for regulatory decisions. See [DISCLAIMER.md](DISCLAIMER.md) for full terms.
