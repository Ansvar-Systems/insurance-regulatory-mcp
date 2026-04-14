#!/usr/bin/env node

/**
 * Insurance Regulatory Intelligence MCP — stdio entry point.
 *
 * Provides MCP tools for querying IAIS Insurance Core Principles,
 * Application Papers, ComFrame, NAIC Model Laws, and Lloyd's Market
 * Requirements. Premium-enabled: full-text access requires a premium
 * Ansvar subscription.
 *
 * Tool names: search_insurance_standards, get_insurance_standard,
 *             search_application_papers, list_insurance_frameworks,
 *             about, list_sources
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import {
  searchRegulations,
  searchControls,
  getControl,
  getCircular,
  listFrameworks,
  getStats,
} from "./db.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

let pkgVersion = "0.1.0";
try {
  const pkg = JSON.parse(
    readFileSync(join(__dirname, "..", "package.json"), "utf8"),
  ) as { version: string };
  pkgVersion = pkg.version;
} catch {
  // fallback
}

let sourcesYml = "";
try {
  sourcesYml = readFileSync(join(__dirname, "..", "sources.yml"), "utf8");
} catch {
  // fallback
}

const SERVER_NAME = "insurance-regulatory-mcp";

const DISCLAIMER =
  "This data is provided for informational reference only. It does not constitute legal or professional advice. " +
  "Always verify against official IAIS publications at https://www.iaisweb.org/. " +
  "IAIS standards are subject to revision; confirm currency before reliance. " +
  "This MCP is premium-enabled — full access requires an Ansvar premium subscription.";

const SOURCE_URL = "https://www.iaisweb.org/activities-topics/insurance-core-principles/";

// --- Tool definitions ---------------------------------------------------------

const TOOLS = [
  {
    name: "search_insurance_standards",
    description:
      "Full-text search across IAIS Insurance Core Principles (ICPs), Application Papers, ComFrame, " +
      "NAIC Model Laws, and Lloyd's Market Requirements. " +
      "Returns matching standards with reference, title, domain, and summary. " +
      "Premium-enabled: available to Ansvar premium subscribers.",
    inputSchema: {
      type: "object" as const,
      properties: {
        query: {
          type: "string",
          description:
            "Search query (e.g., 'risk management', 'capital adequacy', 'cyber insurance', 'conduct of business')",
        },
        domain: {
          type: "string",
          description:
            "Filter by domain or category (e.g., 'Insurance Core Principles', " +
            "'Application Papers', 'Supplementary Standards'). Optional.",
        },
        limit: {
          type: "number",
          description: "Maximum number of results to return. Defaults to 10, max 50.",
        },
      },
      required: ["query"],
    },
  },
  {
    name: "get_insurance_standard",
    description:
      "Get a specific IAIS standard, ICP, or application paper by its reference identifier. " +
      "For ICPs use the ICP number (e.g., 'ICP-1', 'ICP-16', 'ICP-19'). " +
      "For application papers use the paper reference (e.g., 'AP-CYBER-2023', 'AP-CLIMATE-2021'). " +
      "For NAIC or Lloyd's documents use the document reference (e.g., 'NAIC-MDL-668', 'LLOYDS-MS-001'). " +
      "Premium-enabled: available to Ansvar premium subscribers.",
    inputSchema: {
      type: "object" as const,
      properties: {
        standard_id: {
          type: "string",
          description: "ICP number, application paper reference, or supplementary standard reference",
        },
      },
      required: ["standard_id"],
    },
  },
  {
    name: "search_application_papers",
    description:
      "Search IAIS Application Papers specifically. Covers papers on cyber risk, climate risk, " +
      "AI and machine learning, ESG integration, conduct of business, group supervision, " +
      "systemic risk, and the Holistic Framework. Also covers ComFrame materials for " +
      "Internationally Active Insurance Groups (IAIGs). " +
      "Returns papers with their scope, applicability, and key guidance. " +
      "Premium-enabled: available to Ansvar premium subscribers.",
    inputSchema: {
      type: "object" as const,
      properties: {
        query: {
          type: "string",
          description:
            "Search query (e.g., 'cyber risk underwriting', 'climate scenario analysis', " +
            "'algorithmic underwriting', 'ESG disclosure')",
        },
        framework: {
          type: "string",
          enum: ["iais-icp", "iais-comframe", "iais-holistic", "naic", "lloyds"],
          description:
            "Filter by framework. iais-icp=Insurance Core Principles, " +
            "iais-comframe=Common Framework for IAIGs, iais-holistic=Holistic Framework, " +
            "naic=NAIC Model Laws, lloyds=Lloyd's Market Requirements. Optional.",
        },
        domain: {
          type: "string",
          description:
            "Filter by topic domain (e.g., 'Cyber Risk', 'Climate Risk', 'Group Supervision'). Optional.",
        },
        limit: {
          type: "number",
          description: "Maximum number of results to return. Defaults to 10, max 50.",
        },
      },
      required: ["query"],
    },
  },
  {
    name: "list_insurance_frameworks",
    description:
      "List all insurance regulatory frameworks covered by this server, including version, " +
      "effective date, standard count, and coverage scope. " +
      "Frameworks include IAIS ICPs, IAIS Application Papers, ComFrame, NAIC Model Laws, " +
      "and Lloyd's Market Requirements. " +
      "Use this to understand what regulatory material is available before searching.",
    inputSchema: {
      type: "object" as const,
      properties: {},
      required: [],
    },
  },
  {
    name: "about",
    description:
      "Return metadata about this MCP server: version, data sources, coverage summary, " +
      "and list of available tools. Premium-enabled per fleet manifest.",
    inputSchema: {
      type: "object" as const,
      properties: {},
      required: [],
    },
  },
  {
    name: "list_sources",
    description:
      "Return data provenance information: which IAIS and supplementary sources are indexed, " +
      "how data is retrieved, update frequency, and licensing terms.",
    inputSchema: {
      type: "object" as const,
      properties: {},
      required: [],
    },
  },
];

// --- Zod schemas --------------------------------------------------------------

const SearchInsuranceStandardsArgs = z.object({
  query: z.string().min(1),
  domain: z.string().optional(),
  limit: z.number().int().positive().max(50).optional(),
});

const GetInsuranceStandardArgs = z.object({
  standard_id: z.string().min(1),
});

const SearchApplicationPapersArgs = z.object({
  query: z.string().min(1),
  framework: z.enum(["iais-icp", "iais-comframe", "iais-holistic", "naic", "lloyds"]).optional(),
  domain: z.string().optional(),
  limit: z.number().int().positive().max(50).optional(),
});

// --- Helpers ------------------------------------------------------------------

function textContent(data: unknown) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
  };
}

function errorContent(message: string) {
  return {
    content: [{ type: "text" as const, text: message }],
    isError: true as const,
  };
}

function buildMeta(sourceUrl?: string): Record<string, unknown> {
  return {
    disclaimer: DISCLAIMER,
    data_age: "See coverage.json; refresh frequency: quarterly",
    source_url: sourceUrl ?? SOURCE_URL,
  };
}

// --- Server -------------------------------------------------------------------

const server = new Server(
  { name: SERVER_NAME, version: pkgVersion },
  { capabilities: { tools: {} } },
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: TOOLS }));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args = {} } = request.params;

  try {
    switch (name) {
      case "search_insurance_standards": {
        const parsed = SearchInsuranceStandardsArgs.parse(args);
        const results = searchRegulations({
          query: parsed.query,
          domain: parsed.domain,
          limit: parsed.limit ?? 10,
        });
        return textContent({
          results,
          count: results.length,
          _meta: buildMeta(),
        });
      }

      case "get_insurance_standard": {
        const parsed = GetInsuranceStandardArgs.parse(args);
        const standardId = parsed.standard_id;

        // Try control/standard first
        const control = getControl(standardId);
        if (control) {
          return textContent({
            ...control,
            _citation: {
              canonical_ref: control.control_ref,
              display_text: `IAIS — ${control.title} (${control.control_ref})`,
            },
            _meta: buildMeta(),
          });
        }

        // Try supplementary standard (stored as circular)
        const circular = getCircular(standardId);
        if (circular) {
          return textContent({
            ...circular,
            _citation: {
              canonical_ref: circular.reference,
              display_text: `Insurance Standard — ${circular.title} (${circular.reference})`,
            },
            _meta: buildMeta(circular.pdf_url ?? SOURCE_URL),
          });
        }

        return errorContent(
          `No standard found with reference: ${standardId}. ` +
            "Use search_insurance_standards to find available references.",
        );
      }

      case "search_application_papers": {
        const parsed = SearchApplicationPapersArgs.parse(args);
        const results = searchControls({
          query: parsed.query,
          framework: parsed.framework,
          domain: parsed.domain,
          limit: parsed.limit ?? 10,
        });
        return textContent({
          results,
          count: results.length,
          _meta: buildMeta(),
        });
      }

      case "list_insurance_frameworks": {
        const frameworks = listFrameworks();
        return textContent({
          frameworks,
          count: frameworks.length,
          _meta: buildMeta(),
        });
      }

      case "about": {
        const stats = getStats();
        return textContent({
          name: SERVER_NAME,
          version: pkgVersion,
          description:
            "Insurance Regulatory Intelligence MCP server. " +
            "Provides structured access to IAIS Insurance Core Principles, Application Papers, " +
            "ComFrame (Common Framework for Internationally Active Insurance Groups), " +
            "NAIC Model Laws, and Lloyd's Market Requirements. " +
            "Premium-enabled: full access requires an Ansvar premium subscription.",
          data_source: "IAIS and international insurance standards",
          source_url: SOURCE_URL,
          coverage: {
            frameworks: `${stats.frameworks} insurance regulatory frameworks`,
            standards: `${stats.controls} ICPs and application paper entries`,
            supplementary: `${stats.circulars} supplementary standards (NAIC/Lloyd's)`,
            jurisdictions: ["INTL"],
            sectors: ["Insurance", "Reinsurance", "Insurance Groups", "Cyber Underwriting"],
          },
          premium_enabled: true,
          tools: TOOLS.map((t) => ({ name: t.name, description: t.description })),
          _meta: buildMeta(),
        });
      }

      case "list_sources": {
        return textContent({
          sources_yml: sourcesYml,
          note: "Data is sourced from official IAIS publications, NAIC, and Lloyd's of London. See sources.yml for full provenance.",
          _meta: buildMeta(),
        });
      }

      default:
        return errorContent(`Unknown tool: ${name}`);
    }
  } catch (err) {
    return errorContent(
      `Error executing ${name}: ${err instanceof Error ? err.message : String(err)}`,
    );
  }
});

// --- Start --------------------------------------------------------------------

async function main(): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  process.stderr.write(`${SERVER_NAME} v${pkgVersion} running on stdio\n`);
}

main().catch((err) => {
  process.stderr.write(
    `Fatal error: ${err instanceof Error ? err.message : String(err)}\n`,
  );
  process.exit(1);
});
