# Coverage — Insurance Regulatory Intelligence MCP

> Last verified: 2026-04-14 | Database version: 0.1.0

## What's Included

| Source | Items | Version | Last Ingested |
|--------|-------|---------|---------------|
| IAIS Insurance Core Principles (ICPs) | 26 | December 2024 (with ICP-26 from 2018 revision) | 2026-04-14 |
| IAIS Application Papers | 14 | Current (2018–2026, final adopted versions) | 2026-04-14 |
| IAIS Supervisory Material (peer reviews, issues papers, climate guidance) | 17 | Current | 2026-04-14 |
| NAIC Model Laws | 0 (auth-gated — excluded) | — | 2026-04-14 |
| Lloyd's Market Bulletins | 0 (JS-rendered listing — excluded) | — | 2026-04-14 |

**Total:** 8 frameworks, 28 controls (26 ICPs + 2 overview controls), 31 circulars.

## Partial Coverage

Two of the three target sources could not be ingested on 2026-04-14:

- **NAIC Model Laws** — `content.naic.org/cipr_topics/` returns HTTP 403 to unauthenticated clients. Most model-law PDFs sit behind member registration. We do not attempt to bypass authentication. Premium tier customers may supply their own NAIC credentials in a future iteration.
- **Lloyd's Market Bulletins** — `www.lloyds.com/market-resources/market-bulletins` is reachable (HTTP 200) but the bulletin listing is rendered client-side via JavaScript; no server-rendered HTML links or public JSON feed is exposed. Two curated known-bulletin URLs were probed and returned HTTP 404. Capturing Lloyd's bulletins reliably requires either a headless browser pass or the official bulletin subscription feed (TBD).

## Premium Tier

This MCP is premium-enabled. The seed database contains sample data for all frameworks. Full-text access to complete ICP text, application paper guidance, and supplementary standards requires an Ansvar premium subscription.

## What's NOT Included

| Gap | Reason | Planned? |
|-----|--------|----------|
| NAIC Model Laws | Account registration required | Future (customer-provided creds) |
| Lloyd's Market Bulletins | JS-rendered listing | Future (headless scrape) |
| Non-English publications | Translations skipped to avoid duplicate ICP entries | No |
| National implementation (Solvency II, RBC, etc.) | Separate jurisdiction MCPs | Yes |
| Court decisions on insurance regulation | Not in scope | No |
| Confidential supervisory letters | Not publicly available | No |
| Draft / consultation papers | Only finalised standards indexed | Quarterly review |

## ICP Coverage Detail

| ICP | Title | Source |
|-----|-------|--------|
| ICP 1 | Objectives, Powers and Responsibilities of the Supervisor | Dec 2024 master |
| ICP 2 | Supervisor | Dec 2024 master |
| ICP 3 | Information Exchange and Confidentiality Requirements | Dec 2024 master |
| ICP 4 | Licensing | Dec 2024 master |
| ICP 5 | Suitability of Persons | Dec 2024 master |
| ICP 6 | Changes in Control and Portfolio Transfers | Dec 2024 master |
| ICP 7 | Corporate Governance | Dec 2024 master |
| ICP 8 | Risk Management and Internal Controls | Dec 2024 master |
| ICP 9 | Supervisory Review and Reporting | Dec 2024 master |
| ICP 10 | Preventive Measures, Corrective Measures and Sanctions | Dec 2024 master |
| ICP 11 | Enforcement | Dec 2024 master |
| ICP 12 | Exit from the Market and Resolution | Dec 2024 master |
| ICP 13 | Reinsurance and Other Forms of Risk Transfer | Dec 2024 master |
| ICP 14 | Valuation | Dec 2024 master |
| ICP 15 | Investments | Dec 2024 master |
| ICP 16 | Enterprise Risk Management for Solvency Purposes | Dec 2024 master |
| ICP 17 | Capital Adequacy | Dec 2024 master |
| ICP 18 | Intermediaries | Dec 2024 master |
| ICP 19 | Conduct of Business | Dec 2024 master |
| ICP 20 | Public Disclosure | Dec 2024 master |
| ICP 21 | Countering Fraud in Insurance | Dec 2024 master |
| ICP 22 | Anti-Money Laundering and Combating the Financing of Terrorism | Dec 2024 master |
| ICP 23 | Group-wide Supervision | Dec 2024 master |
| ICP 24 | Macroprudential Supervision | Dec 2024 master |
| ICP 25 | Supervisory Cooperation and Coordination | Dec 2024 master |
| ICP 26 | Cross-border Cooperation and Coordination on Crisis Management | 2018 revision (consolidated into ICP 25 in later IAIS revisions; retained here for completeness) |

## Data Freshness

| Source | Refresh Schedule | Last Refresh | Next Expected |
|--------|-----------------|-------------|---------------|
| IAIS ICPs, ComFrame, Application Papers | Quarterly | 2026-04-14 | 2026-07-14 |
| NAIC Model Laws | On credential availability | Not yet ingested | — |
| Lloyd's Market Bulletins | On listing API access | Not yet ingested | — |

To check freshness programmatically, call the `about` tool.
