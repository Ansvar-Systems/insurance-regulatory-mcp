/**
 * Build the Insurance Regulatory SQLite database from fetched raw data.
 *
 * Reads .meta.json files from data/raw/, classifies each document, parses the
 * master IAIS ICPs-and-ComFrame PDF into 26 ICPs, and inserts frameworks,
 * controls (ICPs), and circulars (Application Papers / supplementary).
 *
 * Usage:
 *   npx tsx scripts/build-db.ts
 *   npx tsx scripts/build-db.ts --force   # drop and rebuild database
 *   npx tsx scripts/build-db.ts --dry-run # log what would be inserted
 */

import Database from "better-sqlite3";
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  unlinkSync,
} from "node:fs";
import { join, dirname } from "node:path";
import { SCHEMA_SQL } from "../src/db.js";

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const DB_PATH = process.env["INSURANCE_DB_PATH"] ?? "data/insurance.db";
const RAW_DIR = "data/raw";

const args = process.argv.slice(2);
const force = args.includes("--force");
const dryRun = args.includes("--dry-run");

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type SourceName = "iais" | "naic" | "lloyds";

interface FetchedDocument {
  title: string;
  url: string;
  category: string;
  filename: string;
  source: SourceName;
  text: string;
  fetchedAt: string;
}

// ---------------------------------------------------------------------------
// Classification
// ---------------------------------------------------------------------------

function isMasterIcpDocument(doc: FetchedDocument): boolean {
  const fn = doc.filename.toLowerCase();
  const title = doc.title.toLowerCase();
  return (
    fn.includes("icps-and-comframe") ||
    title.includes("icps and comframe") ||
    fn.includes("all-adopted-icps") ||
    fn.includes("all-icps-adopted")
  );
}

function isFrameworkDocument(doc: FetchedDocument): boolean {
  const cat = (doc.category ?? "").toLowerCase();
  if (cat.includes("core principle") || cat.includes("comframe") || cat.includes("holistic")) {
    return true;
  }
  return isMasterIcpDocument(doc);
}

// ---------------------------------------------------------------------------
// Metadata extraction
// ---------------------------------------------------------------------------

function extractDate(text: string): string | null {
  const patterns = [
    /\b(\d{1,2})\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{4})\b/i,
    /\b(\d{4})-(\d{2})-(\d{2})\b/,
    /\b(\d{2})\/(\d{2})\/(\d{4})\b/,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      if (match[2] && /[a-z]/i.test(match[2])) {
        const months: Record<string, string> = {
          january: "01", february: "02", march: "03", april: "04",
          may: "05", june: "06", july: "07", august: "08",
          september: "09", october: "10", november: "11", december: "12",
        };
        const month = months[match[2]!.toLowerCase()] ?? "01";
        return `${match[3]}-${month}-${match[1]!.padStart(2, "0")}`;
      }
      return match[0]!;
    }
  }
  return null;
}

function buildSummary(text: string, maxLen = 500): string {
  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 50);
  const firstParagraph = lines[0] ?? "";
  return firstParagraph.length > maxLen
    ? firstParagraph.substring(0, maxLen) + "..."
    : firstParagraph;
}

function frameworkIdForDoc(doc: FetchedDocument): string {
  const fn = doc.filename.toLowerCase();
  if (isMasterIcpDocument(doc)) {
    if (fn.includes("2024") || doc.title.toLowerCase().includes("december 2024")) {
      return "iais-icps-comframe-2024";
    }
    if (fn.includes("2019") || fn.includes("191115")) return "iais-icps-comframe-2019";
    if (fn.includes("2018") || fn.includes("181115")) return "iais-icps-2018";
    if (fn.includes("2017") || fn.includes("181115-all")) return "iais-icps-2017";
    if (fn.includes("2015")) return "iais-icps-2015";
    return "iais-icps-comframe";
  }
  const cat = (doc.category ?? "").toLowerCase();
  if (cat.includes("holistic")) return "iais-holistic-framework";
  if (cat.includes("comframe")) return "iais-comframe";
  if (cat.includes("insurance capital standard") || cat.includes("ics")) return "iais-ics";
  if (cat.includes("application papers")) return "iais-application-papers";
  if (cat.includes("naic")) return "naic-model-laws";
  if (cat.includes("lloyd")) return "lloyds-market-requirements";
  return "iais-supervisory-material";
}

function circularReferenceForDoc(doc: FetchedDocument, index: number): string {
  const fn = doc.filename.toLowerCase();
  const title = doc.title.toLowerCase();

  // Heuristic reference tokens for each source
  if (doc.source === "iais") {
    if (title.includes("cyber")) return `IAIS-AP-CYBER-${extractYearFromDoc(doc)}`;
    if (title.includes("climate")) return `IAIS-AP-CLIMATE-${extractYearFromDoc(doc)}`;
    if (title.includes("artificial intelligence")) return `IAIS-AP-AI-${extractYearFromDoc(doc)}`;
    if (title.includes("operational resilience")) return `IAIS-AP-OPRES-${extractYearFromDoc(doc)}`;
    if (title.includes("dei")) return `IAIS-AP-DEI-${extractYearFromDoc(doc)}`;
    if (title.includes("fair treatment")) return `IAIS-AP-FAIRTREAT-${extractYearFromDoc(doc)}`;
    if (title.includes("money laundering") || title.includes("mltf") || title.includes("amlcft")) {
      return `IAIS-AP-AMLCFT-${extractYearFromDoc(doc)}`;
    }
    if (title.includes("supervisory colleges")) return `IAIS-AP-COLLEGES-${extractYearFromDoc(doc)}`;
    if (title.includes("recovery planning")) return `IAIS-AP-RECOVERY-${extractYearFromDoc(doc)}`;
    if (title.includes("resolution")) return `IAIS-AP-RESOLUTION-${extractYearFromDoc(doc)}`;
    if (title.includes("liquidity")) return `IAIS-AP-LIQUIDITY-${extractYearFromDoc(doc)}`;
    if (title.includes("macroprudential")) return `IAIS-AP-MACROPRUDENTIAL-${extractYearFromDoc(doc)}`;
    if (title.includes("control functions")) return `IAIS-AP-CONTROLFN-${extractYearFromDoc(doc)}`;
    if (title.includes("composition") && title.includes("board")) {
      return `IAIS-AP-BOARD-${extractYearFromDoc(doc)}`;
    }
    if (title.includes("cybersecurity")) return `IAIS-AP-CYBERSEC-${extractYearFromDoc(doc)}`;
    if (title.includes("proactive supervision")) return `IAIS-AP-PROACTIVEGOV-${extractYearFromDoc(doc)}`;
    if (title.includes("digital technology")) return `IAIS-AP-DIGITECH-${extractYearFromDoc(doc)}`;
    if (title.includes("holistic framework")) return `IAIS-HF-${extractYearFromDoc(doc)}`;
    if (title.includes("comframe")) return `IAIS-COMFRAME-${extractYearFromDoc(doc)}`;
    return `IAIS-DOC-${extractYearFromDoc(doc)}-${String(index + 1).padStart(3, "0")}`;
  }

  if (doc.source === "naic") {
    const mdlMatch = fn.match(/mdl-?(\d{3})/i);
    if (mdlMatch) return `NAIC-MDL-${mdlMatch[1]}`;
    return `NAIC-DOC-${String(index + 1).padStart(3, "0")}`;
  }

  if (doc.source === "lloyds") {
    const yMatch = fn.match(/y[- ]?(\d{4,5})/i);
    if (yMatch) return `LLOYDS-Y${yMatch[1]}`;
    return `LLOYDS-BULL-${String(index + 1).padStart(3, "0")}`;
  }

  return `INSURANCE-DOC-${String(index + 1).padStart(3, "0")}`;
}

function extractYearFromDoc(doc: FetchedDocument): string {
  // Prefer year in filename or URL (YYYY segment in iais.org /uploads/YYYY/MM/)
  const urlMatch = doc.url.match(/uploads\/(\d{4})\//);
  if (urlMatch && urlMatch[1]) return urlMatch[1];
  const fnMatch = doc.filename.match(/(\d{4})/);
  if (fnMatch && fnMatch[1] && parseInt(fnMatch[1], 10) > 2000 && parseInt(fnMatch[1], 10) < 2100) {
    return fnMatch[1];
  }
  const dateStr = extractDate(doc.text);
  if (dateStr && /^\d{4}/.test(dateStr)) return dateStr.substring(0, 4);
  return "UNDATED";
}

// ---------------------------------------------------------------------------
// Parse ICPs from master document
// ---------------------------------------------------------------------------

interface IcpEntry {
  number: number;
  title: string;
  text: string;
}

/**
 * Parse the IAIS ICPs-and-ComFrame master PDF text into individual ICP entries.
 *
 * The PDF contains 26 Insurance Core Principles with canonical titles. We locate
 * each by matching on the `ICP N` heading pattern and the known principle title,
 * then slice the text between successive ICP headings.
 */
function parseIcps(fullText: string): IcpEntry[] {
  // Canonical ICP titles (IAIS, adopted 2019, revised 2024).
  const ICP_TITLES: Array<{ n: number; t: string }> = [
    { n: 1, t: "Objectives, Powers and Responsibilities of the Supervisor" },
    { n: 2, t: "Supervisor" },
    { n: 3, t: "Information Exchange and Confidentiality Requirements" },
    { n: 4, t: "Licensing" },
    { n: 5, t: "Suitability of Persons" },
    { n: 6, t: "Changes in Control and Portfolio Transfers" },
    { n: 7, t: "Corporate Governance" },
    { n: 8, t: "Risk Management and Internal Controls" },
    { n: 9, t: "Supervisory Review and Reporting" },
    { n: 10, t: "Preventive Measures, Corrective Measures and Sanctions" },
    { n: 11, t: "Enforcement" },
    { n: 12, t: "Exit from the Market and Resolution" },
    { n: 13, t: "Reinsurance and Other Forms of Risk Transfer" },
    { n: 14, t: "Valuation" },
    { n: 15, t: "Investments" },
    { n: 16, t: "Enterprise Risk Management for Solvency Purposes" },
    { n: 17, t: "Capital Adequacy" },
    { n: 18, t: "Intermediaries" },
    { n: 19, t: "Conduct of Business" },
    { n: 20, t: "Public Disclosure" },
    { n: 21, t: "Countering Fraud in Insurance" },
    { n: 22, t: "Anti-Money Laundering and Combating the Financing of Terrorism" },
    { n: 23, t: "Group-wide Supervision" },
    { n: 24, t: "Macroprudential Supervision" },
    { n: 25, t: "Supervisory Cooperation and Coordination" },
    { n: 26, t: "Cross-border Cooperation and Coordination on Crisis Management" },
  ];

  const entries: IcpEntry[] = [];

  // Build a regex per ICP and find each heading occurrence. Strategies tried in
  // order per ICP:
  //   1) Explicit "ICP N <Title>" within 80 chars (covers most cases)
  //   2) First occurrence of "N.0.1" numbered paragraph (IAIS canonical sub-numbering)
  //   3) Standalone title match (last resort)
  const positions: Array<{ n: number; title: string; idx: number }> = [];

  for (const { n, t } of ICP_TITLES) {
    const firstWord = t.split(/\s+/)[0]!;
    let found: number = -1;

    // Strategy 1: explicit ICP N <Title>
    const p1 = new RegExp(`ICP\\s*${n}\\b[\\s\\S]{0,80}?${escapeRegex(firstWord)}`, "i");
    const m1 = p1.exec(fullText);
    if (m1) {
      found = m1.index;
    } else {
      // Strategy 2: first instance of "N.0.1" numbered paragraph
      const p2 = new RegExp(`\\b${n}\\.0\\.1\\b`);
      const m2 = p2.exec(fullText);
      if (m2) {
        // Back up to the nearest preceding section heading (title line)
        const titleIdx = fullText.lastIndexOf(t, m2.index);
        found = titleIdx > 0 && m2.index - titleIdx < 2000 ? titleIdx : m2.index;
      } else {
        // Strategy 3: standalone title occurrence after table-of-contents
        const allMatches = [...fullText.matchAll(new RegExp(escapeRegex(t), "g"))];
        // Skip TOC hits (typically first few matches), prefer a match that
        // appears later in the document.
        const body = allMatches[allMatches.length - 1];
        if (body) found = body.index ?? -1;
      }
    }

    if (found >= 0) {
      positions.push({ n, title: t, idx: found });
    }
  }

  // Sort by position in document and slice between consecutive positions
  positions.sort((a, b) => a.idx - b.idx);

  for (let i = 0; i < positions.length; i++) {
    const cur = positions[i]!;
    const next = positions[i + 1];
    const end = next ? next.idx : Math.min(cur.idx + 80_000, fullText.length);
    const slice = fullText.substring(cur.idx, end).trim();
    // Cap to first 20,000 chars so we don't bloat the DB with one very long ICP
    const bounded = slice.substring(0, 20_000);
    entries.push({ number: cur.n, title: cur.title, text: bounded });
  }

  return entries;
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  if (!existsSync(RAW_DIR)) {
    console.error(`Raw data directory not found: ${RAW_DIR}`);
    console.error("Run: npm run ingest:fetch");
    process.exit(1);
  }

  const metaFiles = readdirSync(RAW_DIR)
    .filter((f) => f.endsWith(".meta.json"))
    .sort();

  if (metaFiles.length === 0) {
    console.warn("No .meta.json files found. Run: npm run ingest:fetch");
    return;
  }

  console.log(`Found ${metaFiles.length} fetched documents`);

  const docs: FetchedDocument[] = metaFiles.map(
    (f) => JSON.parse(readFileSync(join(RAW_DIR, f), "utf8")) as FetchedDocument,
  );

  // Process the newest IAIS ICP master document first so its 26 ICPs land
  // before any older-collection masters, which then no-op via INSERT OR IGNORE.
  docs.sort((a, b) => {
    const aIsMaster = isMasterIcpDocument(a) ? 1 : 0;
    const bIsMaster = isMasterIcpDocument(b) ? 1 : 0;
    if (aIsMaster !== bIsMaster) return bIsMaster - aIsMaster;
    if (aIsMaster && bIsMaster) {
      const aYear = parseInt(extractYearFromDoc(a), 10) || 0;
      const bYear = parseInt(extractYearFromDoc(b), 10) || 0;
      return bYear - aYear;
    }
    return 0;
  });

  if (dryRun) {
    for (const doc of docs) {
      const type = isFrameworkDocument(doc) ? "framework" : "circular";
      console.log(
        `  [${type}] [${doc.source}] ${doc.title} (${doc.text.length.toLocaleString()} chars)`,
      );
    }
    return;
  }

  const dir = dirname(DB_PATH);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  if (force && existsSync(DB_PATH)) {
    unlinkSync(DB_PATH);
    console.log(`Deleted ${DB_PATH}`);
  }

  const db = new Database(DB_PATH);
  db.pragma("journal_mode = DELETE");
  db.pragma("foreign_keys = ON");
  db.exec(SCHEMA_SQL);

  const insertFramework = db.prepare(
    "INSERT OR IGNORE INTO frameworks " +
      "(id, name, version, domain, framework, description, control_count, effective_date, pdf_url) " +
      "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
  );
  const insertControl = db.prepare(
    "INSERT OR IGNORE INTO controls " +
      "(framework_id, control_ref, domain, subdomain, title, description, maturity_level, priority) " +
      "VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
  );
  const insertCircular = db.prepare(
    "INSERT OR IGNORE INTO circulars " +
      "(reference, title, date, category, summary, full_text, pdf_url, status) " +
      "VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
  );

  let frameworksInserted = 0;
  let controlsInserted = 0;
  let circularsInserted = 0;

  // Insert a single parent framework row for "Application Papers" and for Lloyd's so
  // circulars have a coherent grouping when queried via list_insurance_frameworks.
  const frameworkCatalog: Array<{
    id: string;
    name: string;
    version: string | null;
    domain: string;
    framework: string;
    description: string;
    effective_date: string | null;
    pdf_url: string;
  }> = [];

  for (const doc of docs) {
    const fwId = frameworkIdForDoc(doc);
    console.log(
      `Processing [${doc.source}] [${isFrameworkDocument(doc) ? "framework" : "circular"}]: ${doc.title}`,
    );

    if (isMasterIcpDocument(doc)) {
      // Master ICP document: register framework and parse 26 ICPs.
      const fwResult = insertFramework.run(
        fwId,
        doc.title,
        extractYearFromDoc(doc),
        "Insurance Core Principles",
        "iais-icp",
        buildSummary(doc.text, 1000),
        0,
        extractDate(doc.text),
        doc.url,
      );
      if (fwResult.changes > 0) frameworksInserted++;

      const icps = parseIcps(doc.text);
      console.log(`  Parsed ${icps.length} ICPs from master document`);

      let insertedHere = 0;
      for (const icp of icps) {
        const controlRef = `ICP-${icp.number}`;
        const domainLabel = `ICP ${icp.number}`;
        const description = icp.text || `See ${doc.url} for the full text of ICP ${icp.number}.`;
        const result = insertControl.run(
          fwId,
          controlRef,
          domainLabel,
          "Insurance Core Principle",
          icp.title,
          description,
          null,
          null,
        );
        if (result.changes > 0) {
          controlsInserted++;
          insertedHere++;
        }
      }

      // Update control_count on the framework row to reflect actual inserts.
      // Use MAX so later runs against the same framework don't overwrite with 0
      // when all ICPs were already populated by an earlier master document.
      db.prepare("UPDATE frameworks SET control_count = MAX(control_count, ?) WHERE id = ?").run(
        insertedHere,
        fwId,
      );
      continue;
    }

    if (isFrameworkDocument(doc)) {
      // Non-master IAIS framework PDF (ComFrame, Holistic Framework, ICS) —
      // register as framework without ICP-level parsing; attach one placeholder
      // overview control pointing to the PDF for downstream citations.
      const fwResult = insertFramework.run(
        fwId,
        doc.title,
        extractYearFromDoc(doc),
        doc.category,
        fwId,
        buildSummary(doc.text, 1000),
        1,
        extractDate(doc.text),
        doc.url,
      );
      if (fwResult.changes > 0) frameworksInserted++;

      const controlRef = `${fwId.toUpperCase()}-OVERVIEW`;
      const controlResult = insertControl.run(
        fwId,
        controlRef,
        doc.category,
        "Overview",
        `${doc.title} — Overview`,
        doc.text.substring(0, 10_000) || `See ${doc.url} for the full document.`,
        null,
        null,
      );
      if (controlResult.changes > 0) controlsInserted++;
      continue;
    }

    // Circular-style: Application Papers, NAIC model laws, Lloyd's bulletins.
    // Ensure a parent framework exists for grouping.
    const parentFwId = frameworkIdForDoc(doc);
    if (!frameworkCatalog.some((f) => f.id === parentFwId)) {
      const parentName =
        doc.source === "iais"
          ? "IAIS Application Papers and Supervisory Material"
          : doc.source === "naic"
            ? "NAIC Model Laws"
            : doc.source === "lloyds"
              ? "Lloyd's Market Requirements"
              : "Insurance Supervisory Material";
      const parentDomain =
        doc.source === "iais" ? "iais-application-papers" : doc.source;
      insertFramework.run(
        parentFwId,
        parentName,
        null,
        doc.category,
        parentDomain,
        `${parentName} — individual documents are stored as circulars.`,
        0,
        null,
        doc.url,
      );
      frameworkCatalog.push({
        id: parentFwId,
        name: parentName,
        version: null,
        domain: doc.category,
        framework: parentDomain,
        description: parentName,
        effective_date: null,
        pdf_url: doc.url,
      });
      frameworksInserted++;
    }

    const reference = circularReferenceForDoc(doc, circularsInserted);
    const result = insertCircular.run(
      reference,
      doc.title,
      extractDate(doc.text),
      doc.category,
      buildSummary(doc.text),
      doc.text || `See full document at: ${doc.url}`,
      doc.url,
      "active",
    );
    if (result.changes > 0) circularsInserted++;
  }

  db.pragma("journal_mode = WAL");
  db.pragma("vacuum");

  console.log(`
Build complete:
  Frameworks : ${frameworksInserted} inserted
  Controls   : ${controlsInserted} inserted
  Circulars  : ${circularsInserted} inserted

Database: ${DB_PATH}`);
}

main().catch((err) => {
  console.error("Fatal error:", err instanceof Error ? err.message : String(err));
  process.exit(1);
});
