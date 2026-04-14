# Insurance Regulatory Intelligence MCP

MCP server for querying IAIS Insurance Core Principles (ICPs), Application Papers, ComFrame, NAIC Model Laws, and Lloyd's Market Requirements. Part of the [Ansvar](https://ansvar.eu) regulatory intelligence platform.

**Premium-enabled:** full access requires an Ansvar premium subscription.

## What's Included

- **IAIS Insurance Core Principles (ICPs)** — 26 ICPs covering licensing, supervision, corporate governance, ERM, capital adequacy, conduct of business, AML/CFT, group supervision, and cross-border cooperation (2019 revision, 2024 updates)
- **IAIS Application Papers** — Guidance papers on cyber risk, climate risk, AI/ML, ESG, conduct of business, group supervision, and systemic risk
- **ComFrame** — Common Framework for Internationally Active Insurance Groups (IAIGs), integrated with ICPs
- **IAIS Holistic Framework** — Systemic risk assessment framework replacing G-SII designation; includes the Insurance Capital Standard (ICS)
- **NAIC Model Laws** — Selected US insurance model laws on cybersecurity, data security, and privacy
- **Lloyd's Market Requirements** — Minimum Standards for managing agents, cyber underwriting requirements, state-backed attack exclusions

For full coverage details, see [COVERAGE.md](COVERAGE.md). For tool specifications, see [TOOLS.md](TOOLS.md).

## Installation

### npm (stdio transport)

```bash
npm install @ansvar/insurance-regulatory-mcp
```

### Docker (HTTP transport)

```bash
docker pull ghcr.io/ansvar-systems/insurance-regulatory-mcp:latest
docker run -p 8383:8383 ghcr.io/ansvar-systems/insurance-regulatory-mcp:latest
```

## Usage

### stdio (Claude Desktop, Cursor, etc.)

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

### HTTP (Streamable HTTP)

```bash
docker run -p 8383:8383 ghcr.io/ansvar-systems/insurance-regulatory-mcp:latest
# Server available at http://localhost:8383/mcp
```

## Tools

| Tool | Description |
|------|-------------|
| `search_insurance_standards` | Full-text search across ICPs, Application Papers, NAIC, and Lloyd's |
| `get_insurance_standard` | Get a specific standard by reference ID (e.g., ICP-16, AP-CYBER-2023) |
| `search_application_papers` | Search IAIS Application Papers with optional framework/domain filters |
| `list_insurance_frameworks` | List all frameworks with version and standard counts |
| `about` | Server metadata, version, and coverage summary |
| `list_sources` | Data provenance: sources, retrieval method, licensing |
| `check_data_freshness` | Per-source staleness report against expected refresh cadence |

See [TOOLS.md](TOOLS.md) for parameters, return formats, and examples.

All success responses include a `_meta` block (disclaimer, data age,
source URL); `get_insurance_standard` also includes a `_citation` block.
Errors include an `_error_type` discriminator
(`validation_error` | `not_found` | `unknown_tool` | `internal_error`).

## Data Sources

The shipped database carries 67 rows: 8 frameworks, 28 controls
(26 IAIS ICPs + 2 framework overviews), and 31 circulars
(IAIS Application Papers and supervisory material). NAIC and Lloyd's are
covered in scope but not yet populated — see [COVERAGE.md](COVERAGE.md)
for the per-source breakdown and the access caveats below.

All data is sourced from official public publications:

- [IAIS Insurance Core Principles](https://www.iais.org/activities-topics/standard-setting/icps-and-comframe/)
- [IAIS Application Papers](https://www.iais.org/activities-topics/)
- [NAIC Model Laws](https://content.naic.org/model-laws) — most are auth-gated
  behind member registration; this MCP only indexes the publicly-available subset
- [Lloyd's Minimum Standards](https://www.lloyds.com/conducting-business/market-oversight/acts-and-regulation/lloyds-minimum-standards) — bulletin
  listing is JS-rendered; bulletin set is curated rather than auto-harvested

See [sources.yml](sources.yml) for full provenance details.

## Repository Documentation

- [COVERAGE.md](COVERAGE.md) — what is and isn't indexed, per-source breakdown
- [TOOLS.md](TOOLS.md) — full tool spec with parameters and example responses
- [REGISTRY.md](REGISTRY.md) — npm and MCP-registry metadata
- [DISCLAIMER.md](DISCLAIMER.md) — informational reference disclaimer
- [PRIVACY.md](PRIVACY.md) — privacy notice
- [SECURITY.md](SECURITY.md) — vulnerability reporting
- [CONTRIBUTING.md](CONTRIBUTING.md) — dev workflow and branch strategy
- [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) — community standards
- [CHANGELOG.md](CHANGELOG.md) — release notes

## Development

```bash
git clone https://github.com/Ansvar-Systems/insurance-regulatory-mcp.git
cd insurance-regulatory-mcp
npm install
npm run seed        # Create sample database
npm run build       # Compile TypeScript
npm test            # Run tests
npm run dev         # Start HTTP dev server with hot reload
```

## Disclaimer

This server provides informational reference data only. It does not constitute legal or regulatory advice. Always verify against official IAIS, NAIC, and Lloyd's publications. See [DISCLAIMER.md](DISCLAIMER.md) for full terms.

## License

[BSL-1.1](LICENSE) — Ansvar Systems AB. Converts to Apache-2.0 on 2030-04-13.
