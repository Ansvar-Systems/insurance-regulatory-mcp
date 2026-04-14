/**
 * Insurance Regulatory Intelligence Ingestion Fetcher
 *
 * Fetches IAIS, NAIC, and Lloyd's portals, extracts insurance-regulatory PDF links,
 * downloads PDFs, and extracts text content for database ingestion.
 *
 * Primary source: iaisweb.org (ICPs, Application Papers, ComFrame)
 * Supplementary:  content.naic.org (Model Laws), lloyds.com (Market Requirements)
 *
 * Usage:
 *   npx tsx scripts/ingest-fetch.ts
 *   npx tsx scripts/ingest-fetch.ts --dry-run     # log what would be fetched
 *   npx tsx scripts/ingest-fetch.ts --force        # re-download existing files
 *   npx tsx scripts/ingest-fetch.ts --limit 5      # fetch only first N documents
 */

import * as cheerio from "cheerio";
import {
  existsSync,
  mkdirSync,
  writeFileSync,
  readFileSync,
  createWriteStream,
} from "node:fs";
import { join, basename } from "node:path";

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const IAIS_BASE_URL = "https://www.iaisweb.org";
const IAIS_ICP_URL = `${IAIS_BASE_URL}/activities-topics/insurance-core-principles/`;
const IAIS_AP_URL = `${IAIS_BASE_URL}/activities-topics/`;
const NAIC_BASE_URL = "https://content.naic.org";
const NAIC_MODELS_URL = `${NAIC_BASE_URL}/model-laws`;
const LLOYDS_BASE_URL = "https://www.lloyds.com";
const LLOYDS_STANDARDS_URL = `${LLOYDS_BASE_URL}/conducting-business/market-oversight/acts-and-regulation/lloyds-minimum-standards`;

const RAW_DIR = "data/raw";
const RATE_LIMIT_MS = 2000;
const MAX_RETRIES = 3;
const RETRY_BACKOFF_BASE_MS = 2000;
const REQUEST_TIMEOUT_MS = 60_000;
const USER_AGENT = "Ansvar-MCP/1.0 (regulatory-data-ingestion; https://ansvar.eu)";

// Keywords to identify insurance-regulatory relevant documents
const INSURANCE_KEYWORDS = [
  "insurance core principle",
  "icp",
  "application paper",
  "comframe",
  "holistic framework",
  "insurance capital standard",
  "ics",
  "cyber insurance",
  "cyber risk",
  "climate risk",
  "climate change",
  "conduct of business",
  "enterprise risk management",
  "capital adequacy",
  "group supervision",
  "supervisory cooperation",
  "model law",
  "data security",
  "privacy",
  "cybersecurity",
  "minimum standards",
  "managing agent",
];

// CLI flags
const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const force = args.includes("--force");
const limitIdx = args.indexOf("--limit");
const fetchLimit = limitIdx !== -1 ? parseInt(args[limitIdx + 1] ?? "999", 10) : 999;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface DocumentLink {
  title: string;
  url: string;
  category: string;
  filename: string;
  source: "iais" | "naic" | "lloyds";
}

interface FetchedDocument {
  title: string;
  url: string;
  category: string;
  filename: string;
  source: string;
  text: string;
  fetchedAt: string;
}

// ---------------------------------------------------------------------------
// HTTP helpers
// ---------------------------------------------------------------------------

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchWithRetry(
  url: string,
  retries = MAX_RETRIES,
): Promise<Response> {
  let lastError: Error | null = null;
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
      try {
        const response = await fetch(url, {
          headers: { "User-Agent": USER_AGENT },
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
        if (!response.ok) {
          throw new Error(`HTTP ${response.status} for ${url}`);
        }
        return response;
      } finally {
        clearTimeout(timeoutId);
      }
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      const backoff = RETRY_BACKOFF_BASE_MS * Math.pow(2, attempt);
      console.error(
        `  Attempt ${attempt + 1}/${retries} failed for ${url}: ${lastError.message}. ` +
          `Retrying in ${backoff}ms...`,
      );
      if (attempt < retries - 1) await sleep(backoff);
    }
  }
  throw lastError ?? new Error(`All retries failed for ${url}`);
}

// ---------------------------------------------------------------------------
// PDF text extraction
// ---------------------------------------------------------------------------

async function extractPdfText(pdfBuffer: Buffer): Promise<string> {
  try {
    const pdfParse = (await import("pdf-parse")).default;
    const data = await pdfParse(pdfBuffer);
    return data.text ?? "";
  } catch (err) {
    console.error(
      `  Warning: PDF text extraction failed: ${err instanceof Error ? err.message : String(err)}`,
    );
    return "";
  }
}

// ---------------------------------------------------------------------------
// Relevance filter
// ---------------------------------------------------------------------------

function isInsuranceRelevant(title: string): boolean {
  const lower = title.toLowerCase();
  return INSURANCE_KEYWORDS.some((kw) => lower.includes(kw));
}

// ---------------------------------------------------------------------------
// IAIS portal scraping
// ---------------------------------------------------------------------------

async function scrapeIaisPortal(): Promise<DocumentLink[]> {
  console.log(`Fetching IAIS ICP portal: ${IAIS_ICP_URL}`);
  const links: DocumentLink[] = [];

  try {
    const response = await fetchWithRetry(IAIS_ICP_URL);
    const html = await response.text();
    const $ = cheerio.load(html);

    $("a[href]").each((_, el) => {
      const href = $(el).attr("href") ?? "";
      const title = $(el).text().trim();

      if (!href || !title) return;
      if (!href.toLowerCase().endsWith(".pdf") && !href.includes("/activities-topics")) return;

      const fullUrl = href.startsWith("http") ? href : `${IAIS_BASE_URL}${href}`;
      const filename = `iais-${basename(href.split("?")[0] ?? href) || `doc-${links.length + 1}.pdf`}`;

      let category = "Insurance Core Principles";
      if (href.includes("application-paper")) category = "Application Papers";
      else if (href.includes("comframe")) category = "ComFrame";
      else if (href.includes("financial-stability")) category = "Holistic Framework";

      if (links.some((l) => l.url === fullUrl)) return;
      links.push({ title, url: fullUrl, category, filename, source: "iais" });
    });
  } catch (err) {
    console.warn(`  Warning: IAIS portal scraping failed: ${err instanceof Error ? err.message : String(err)}`);
  }

  if (links.length === 0) {
    console.warn("  No links found via IAIS scraping. Falling back to known documents.");
  }

  return links;
}

// ---------------------------------------------------------------------------
// Known document fallback list
// ---------------------------------------------------------------------------

function getKnownDocuments(): DocumentLink[] {
  return [
    // IAIS ICPs
    {
      title: "IAIS Insurance Core Principles (ICPs) 2019",
      url: "https://www.iaisweb.org/uploads/2022/01/ICPs-adopted-in-November-2019-clean-version.pdf",
      category: "Insurance Core Principles",
      filename: "iais-icp-2019.pdf",
      source: "iais",
    },
    // IAIS Application Papers
    {
      title: "Application Paper on Supervision of Insurer Cyber Risk",
      url: "https://www.iaisweb.org/uploads/2023/11/Application-Paper-on-Supervision-of-Insurer-Cyber-Risk.pdf",
      category: "Application Papers",
      filename: "iais-ap-cyber-2023.pdf",
      source: "iais",
    },
    {
      title: "Application Paper on Supervision of Climate-Related Risks",
      url: "https://www.iaisweb.org/uploads/2021/05/Application-Paper-on-the-Supervision-of-Climate-related-Risks-in-the-Insurance-Sector.pdf",
      category: "Application Papers",
      filename: "iais-ap-climate-2021.pdf",
      source: "iais",
    },
    {
      title: "Application Paper on Use of Big Data Analytics in Insurance",
      url: "https://www.iaisweb.org/uploads/2020/07/200716-Application-Paper-on-the-Use-of-Big-Data-Analytics-in-Insurance.pdf",
      category: "Application Papers",
      filename: "iais-ap-bigdata-2020.pdf",
      source: "iais",
    },
    {
      title: "ComFrame — Common Framework for Internationally Active Insurance Groups",
      url: "https://www.iaisweb.org/uploads/2022/01/ComFrame-adopted-in-November-2019-clean-version.pdf",
      category: "ComFrame",
      filename: "iais-comframe-2019.pdf",
      source: "iais",
    },
    {
      title: "Holistic Framework for Systemic Risk in the Insurance Sector",
      url: "https://www.iaisweb.org/uploads/2022/01/Holistic-Framework-for-Systemic-Risk-adopted-November-2019.pdf",
      category: "Holistic Framework",
      filename: "iais-holistic-framework-2019.pdf",
      source: "iais",
    },
    // NAIC Model Laws
    {
      title: "NAIC Insurance Data Security Model Law (MDL-668)",
      url: "https://content.naic.org/sites/default/files/inline-files/MDL-668.pdf",
      category: "NAIC Model Laws",
      filename: "naic-mdl-668.pdf",
      source: "naic",
    },
    {
      title: "NAIC Privacy of Consumer Financial and Health Information Model Regulation (MDL-672)",
      url: "https://content.naic.org/sites/default/files/inline-files/MDL-672.pdf",
      category: "NAIC Model Laws",
      filename: "naic-mdl-672.pdf",
      source: "naic",
    },
    // Lloyd's
    {
      title: "Lloyd's Minimum Standards — Cyber Insurance Underwriting (MS11)",
      url: "https://www.lloyds.com/conducting-business/market-oversight/acts-and-regulation/lloyds-minimum-standards",
      category: "Lloyd's Market Requirements",
      filename: "lloyds-ms11-cyber.pdf",
      source: "lloyds",
    },
    {
      title: "Lloyd's Market Bulletin — State-Backed Cyber Attack Exclusion (Y5381)",
      url: "https://www.lloyds.com/news-and-risk-insight/risk-reports/library/technology/managing-cyber-risk",
      category: "Lloyd's Market Requirements",
      filename: "lloyds-y5381-cyber-exclusion.pdf",
      source: "lloyds",
    },
  ];
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  if (!existsSync(RAW_DIR)) {
    mkdirSync(RAW_DIR, { recursive: true });
    console.log(`Created directory: ${RAW_DIR}`);
  }

  // Scrape IAIS portal; fall back to known list if scraping yields nothing
  let documents = await scrapeIaisPortal();
  if (documents.length === 0) {
    documents = getKnownDocuments();
  }

  console.log(`Found ${documents.length} insurance regulatory documents to process`);

  if (documents.length > fetchLimit) {
    documents = documents.slice(0, fetchLimit);
    console.log(`Limiting to ${fetchLimit} documents`);
  }

  if (dryRun) {
    console.log("\n[DRY RUN] Would fetch:");
    for (const doc of documents) {
      console.log(`  [${doc.source.toUpperCase()}] ${doc.title} → ${doc.filename}`);
    }
    return;
  }

  const fetched: FetchedDocument[] = [];
  let skipped = 0;

  for (let i = 0; i < documents.length; i++) {
    const doc = documents[i]!;
    const destPath = join(RAW_DIR, doc.filename);
    const metaPath = join(RAW_DIR, `${doc.filename}.meta.json`);

    if (!force && existsSync(metaPath)) {
      console.log(`[${i + 1}/${documents.length}] Skipping (exists): ${doc.title}`);
      skipped++;
      continue;
    }

    console.log(`[${i + 1}/${documents.length}] [${doc.source.toUpperCase()}] Fetching: ${doc.title}`);
    console.log(`  URL: ${doc.url}`);

    try {
      const response = await fetchWithRetry(doc.url);
      const buffer = Buffer.from(await response.arrayBuffer());

      writeFileSync(destPath, buffer);
      console.log(`  Downloaded: ${buffer.length.toLocaleString()} bytes → ${destPath}`);

      const text = await extractPdfText(buffer);
      console.log(`  Extracted text: ${text.length.toLocaleString()} chars`);

      const meta: FetchedDocument = {
        title: doc.title,
        url: doc.url,
        category: doc.category,
        filename: doc.filename,
        source: doc.source,
        text,
        fetchedAt: new Date().toISOString(),
      };

      writeFileSync(metaPath, JSON.stringify(meta, null, 2), "utf8");
      fetched.push(meta);
    } catch (err) {
      console.error(
        `  ERROR fetching ${doc.url}: ${err instanceof Error ? err.message : String(err)}`,
      );
    }

    // Rate limit between requests
    if (i < documents.length - 1) {
      await sleep(RATE_LIMIT_MS);
    }
  }

  const summary = {
    fetchedAt: new Date().toISOString(),
    total: documents.length,
    fetched: fetched.length,
    skipped,
    errors: documents.length - fetched.length - skipped,
    documents: fetched.map((d) => ({
      title: d.title,
      filename: d.filename,
      category: d.category,
      source: d.source,
      textLength: d.text.length,
    })),
  };

  writeFileSync(join(RAW_DIR, "fetch-summary.json"), JSON.stringify(summary, null, 2), "utf8");
  console.log(`\nFetch complete: ${fetched.length} fetched, ${skipped} skipped, ${summary.errors} errors`);
  console.log(`Summary written to ${join(RAW_DIR, "fetch-summary.json")}`);
}

main().catch((err) => {
  console.error("Fatal error:", err instanceof Error ? err.message : String(err));
  process.exit(1);
});
