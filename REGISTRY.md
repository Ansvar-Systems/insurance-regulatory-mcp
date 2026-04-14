# Registry Metadata — Insurance Regulatory Intelligence MCP

## npm

- **Package:** `@ansvar/insurance-regulatory-mcp`
- **Description:** "IAIS Insurance Core Principles, Application Papers, ComFrame, NAIC and Lloyd's via MCP. Premium-enabled. Part of Ansvar (ansvar.eu)."

## MCP Registry / Smithery / Glama

- **Name:** Insurance Regulatory Intelligence MCP
- **mcpName:** `intl.ansvar/insurance-regulatory-mcp`
- **Author:** Ansvar Systems AB
- **Author URL:** https://ansvar.eu
- **Category:** regulatory / insurance / international
- **Tags:** iais, insurance, icp, comframe, naic, lloyds, regulation, compliance, mcp, ansvar
- **License:** BSL-1.1 (converts to Apache-2.0 on 2030-04-13)
- **Homepage:** https://ansvar.eu
- **Repository:** https://github.com/Ansvar-Systems/insurance-regulatory-mcp
- **Container image:** `ghcr.io/ansvar-systems/insurance-regulatory-mcp:latest`
- **HTTP endpoint (public):** `https://mcp.ansvar.eu/insurance-regulatory/mcp`

## Medium Description

Query the IAIS Insurance Core Principles (26 ICPs), IAIS Application Papers,
ComFrame for Internationally Active Insurance Groups, the Holistic Framework
for systemic risk, and selected NAIC Model Laws and Lloyd's Market Requirements
directly from Claude, Cursor, or any MCP-compatible client.

Premium-enabled: full text access requires an Ansvar premium subscription. The
seed database carries the public IAIS corpus (sample) so the server is usable
out of the box for evaluation.

This is a research and reference tool, not legal or regulatory advice. Always
verify critical citations against the official IAIS, NAIC, or Lloyd's source.

## Coverage Caveats

- **NAIC Model Laws** — most are auth-gated behind member registration; this
  MCP indexes only the publicly available subset.
- **Lloyd's Market Bulletins** — listing is JS-rendered; bulletin set is
  curated rather than automatically harvested.

See `COVERAGE.md` for the full per-source breakdown.
