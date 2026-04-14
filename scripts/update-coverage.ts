/**
 * Update data/coverage.json with current database statistics.
 *
 * Reads the insurance regulatory SQLite database, groups circulars by source
 * (derived from each document's pdf_url), and writes a coverage summary used
 * by the freshness checker, fleet manifest, and the `list_sources` tool.
 *
 * Usage:
 *   npx tsx scripts/update-coverage.ts
 */

import Database from "better-sqlite3";
import { existsSync, mkdirSync, writeFileSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";

const DB_PATH = process.env["INSURANCE_DB_PATH"] ?? "data/insurance.db";
const COVERAGE_FILE = "data/coverage.json";
const RAW_DIR = "data/raw";

interface CoverageSource {
  name: string;
  url: string;
  last_fetched: string | null;
  update_frequency: string;
  item_count: number;
  status: "current" | "stale" | "gated" | "unknown";
  notes?: string | undefined;
}

interface CoverageFile {
  generatedAt: string;
  mcp: string;
  version: string;
  sources: CoverageSource[];
  totals: {
    frameworks: number;
    controls: number;
    circulars: number;
  };
  per_source_documents: Record<string, number>;
}

function readFetchSummary(): {
  sourceStatus?: Record<string, { status: string; notes: string; documents: number }>;
  perSourceFetched?: Record<string, number>;
  fetchedAt?: string;
} {
  const p = join(RAW_DIR, "fetch-summary.json");
  if (!existsSync(p)) return {};
  try {
    return JSON.parse(readFileSync(p, "utf8"));
  } catch {
    return {};
  }
}

function countPerSource(): Record<string, number> {
  // Count .meta.json files per source (authoritative for what was ingested)
  if (!existsSync(RAW_DIR)) return {};
  const counts: Record<string, number> = {};
  for (const f of readdirSync(RAW_DIR).filter((x) => x.endsWith(".meta.json"))) {
    try {
      const meta = JSON.parse(readFileSync(join(RAW_DIR, f), "utf8"));
      const src: string = meta.source ?? "unknown";
      counts[src] = (counts[src] ?? 0) + 1;
    } catch {
      // ignore malformed
    }
  }
  return counts;
}

async function main(): Promise<void> {
  if (!existsSync(DB_PATH)) {
    console.error(`Database not found: ${DB_PATH}`);
    console.error("Run: npm run build:db");
    process.exit(1);
  }

  const db = new Database(DB_PATH, { readonly: true });

  const frameworks = (db.prepare("SELECT COUNT(*) AS n FROM frameworks").get() as { n: number }).n;
  const controls = (db.prepare("SELECT COUNT(*) AS n FROM controls").get() as { n: number }).n;
  const circulars = (db.prepare("SELECT COUNT(*) AS n FROM circulars").get() as { n: number }).n;

  const summary = readFetchSummary();
  const perSource = countPerSource();
  const fetchStatus = summary.sourceStatus ?? {};

  const sources: CoverageSource[] = [
    {
      name: "IAIS — Insurance Core Principles, ComFrame, Application Papers",
      url: "https://www.iais.org/activities-topics/standard-setting/icps-and-comframe/",
      last_fetched: summary.fetchedAt ?? null,
      update_frequency: "quarterly",
      item_count: perSource["iais"] ?? 0,
      status: (fetchStatus["iais"]?.status === "available" ? "current" : "unknown") as
        | "current"
        | "unknown",
      notes: fetchStatus["iais"]?.notes,
    },
    {
      name: "NAIC — Model Laws",
      url: "https://content.naic.org/cipr_topics/",
      last_fetched: summary.fetchedAt ?? null,
      update_frequency: "quarterly",
      item_count: perSource["naic"] ?? 0,
      status:
        (perSource["naic"] ?? 0) > 0
          ? ("current" as const)
          : ("gated" as const),
      notes:
        fetchStatus["naic"]?.notes ??
        "NAIC model laws require account registration; skipped in this ingestion run.",
    },
    {
      name: "Lloyd's — Market Bulletins",
      url: "https://www.lloyds.com/market-resources/market-bulletins",
      last_fetched: summary.fetchedAt ?? null,
      update_frequency: "rolling",
      item_count: perSource["lloyds"] ?? 0,
      status: (perSource["lloyds"] ?? 0) > 0 ? ("current" as const) : ("unknown" as const),
      notes: fetchStatus["lloyds"]?.notes,
    },
  ];

  const coverage: CoverageFile = {
    generatedAt: new Date().toISOString(),
    mcp: "insurance-regulatory-mcp",
    version: "0.1.0",
    sources,
    totals: { frameworks, controls, circulars },
    per_source_documents: perSource,
  };

  const dir = dirname(COVERAGE_FILE);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

  writeFileSync(COVERAGE_FILE, JSON.stringify(coverage, null, 2), "utf8");

  console.log(`Coverage updated: ${COVERAGE_FILE}`);
  console.log(`  Frameworks : ${frameworks}`);
  console.log(`  Controls   : ${controls}`);
  console.log(`  Circulars  : ${circulars}`);
  console.log(`  Per source : ${JSON.stringify(perSource)}`);
}

main().catch((err) => {
  console.error("Fatal error:", err instanceof Error ? err.message : String(err));
  process.exit(1);
});
