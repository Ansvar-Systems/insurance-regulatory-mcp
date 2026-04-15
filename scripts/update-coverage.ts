/**
 * Update data/coverage.json with current database statistics.
 *
 * Preserves hand-maintained schema fields (schema_version, mcp_type,
 * scope_statement, scope_exclusions, gaps, per-source metadata, notes,
 * completeness, etc.) and only refreshes the dynamic counts + timestamps.
 * Runs safely on CI without clobbering docs.
 *
 * Per-source item_count is recomputed from data/raw/*.meta.json using the
 * existing source's `id` to pick the right key. Source order and entry
 * list are preserved from existing coverage.json.
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

// Map from coverage-source id to raw meta-file `source` field.
const SOURCE_ID_TO_RAW: Record<string, string> = {
  "iais-icps-comframe": "iais",
  "naic-models": "naic",
  "lloyds-bulletins": "lloyds",
};

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

  void readFetchSummary; // retained for possible future use
  const perSource = countPerSource();

  const existing: Record<string, unknown> = existsSync(COVERAGE_FILE)
    ? JSON.parse(readFileSync(COVERAGE_FILE, "utf8"))
    : {};

  // Per-source update: use source.id to look up the raw-meta key.
  // If we have a live count from raw/, use it; otherwise preserve the
  // existing item_count (e.g. for sources where ingestion was gated).
  const sources =
    Array.isArray(existing["sources"]) && existing["sources"].length > 0
      ? (existing["sources"] as Record<string, unknown>[]).map((s) => {
          const id = typeof s["id"] === "string" ? (s["id"] as string) : "";
          const rawKey = SOURCE_ID_TO_RAW[id];
          if (rawKey && rawKey in perSource) {
            return {
              ...s,
              item_count: perSource[rawKey] ?? 0,
            };
          }
          return s;
        })
      : [];

  const totalItems = sources.reduce((acc, s) => {
    const n = s["item_count"];
    return acc + (typeof n === "number" ? n : 0);
  }, 0);

  const existingSummary =
    (existing["summary"] as Record<string, unknown> | undefined) ?? {};
  const summary = {
    ...existingSummary,
    total_sources: sources.length,
    total_items: totalItems,
  };

  // Preserve all keys that existed in the previous per_source_documents
  // (even if currently zero / no raw files present), but overwrite values.
  const existingPerSource =
    (existing["per_source_documents"] as Record<string, number> | undefined) ?? {};
  const mergedPerSource: Record<string, number> = { ...existingPerSource };
  for (const [k, v] of Object.entries(perSource)) mergedPerSource[k] = v;
  // For keys present in existing but missing from raw/, fall back to 0.
  for (const k of Object.keys(existingPerSource)) {
    if (!(k in perSource)) mergedPerSource[k] = 0;
  }

  const coverage = {
    ...existing,
    sources,
    totals: { frameworks, controls, circulars },
    per_source_documents: mergedPerSource,
    summary,
    generatedAt: new Date().toISOString(),
  };

  const dir = dirname(COVERAGE_FILE);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

  writeFileSync(COVERAGE_FILE, JSON.stringify(coverage, null, 2) + "\n", "utf8");

  console.log(`Coverage updated: ${COVERAGE_FILE}`);
  console.log(`  Frameworks : ${frameworks}`);
  console.log(`  Controls   : ${controls}`);
  console.log(`  Circulars  : ${circulars}`);
  console.log(`  Per source : ${JSON.stringify(perSource)}`);
  console.log(
    `  Schema fields preserved: scope_exclusions, gaps, per-source metadata`,
  );
}

main().catch((err) => {
  console.error("Fatal error:", err instanceof Error ? err.message : String(err));
  process.exit(1);
});
