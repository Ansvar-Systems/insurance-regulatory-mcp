/**
 * Insurance Regulatory Intelligence Ingestion Fetcher
 *
 * Fetches IAIS (iais.org), NAIC (content.naic.org) and Lloyd's (lloyds.com) portals,
 * extracts insurance-regulatory PDF links, downloads PDFs, and extracts text content
 * for database ingestion.
 *
 * Primary source: iais.org (ICPs, ComFrame, Application Papers, Holistic Framework)
 * Supplementary: content.naic.org (Model Laws — may be auth-gated), lloyds.com (Market Bulletins)
 *
 * Usage:
 *   npx tsx scripts/ingest-fetch.ts
 *   npx tsx scripts/ingest-fetch.ts --dry-run     # log what would be fetched
 *   npx tsx scripts/ingest-fetch.ts --force        # re-download existing files
 *   npx tsx scripts/ingest-fetch.ts --limit 5      # fetch only first N documents
 *   npx tsx scripts/ingest-fetch.ts --source iais  # fetch only IAIS (also: naic, lloyds)
 */

import {
  existsSync,
  mkdirSync,
  writeFileSync,
} from "node:fs";
import { join, basename } from "node:path";

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const IAIS_BASE_URL = "https://www.iais.org";
const IAIS_ICP_URL = `${IAIS_BASE_URL}/activities-topics/standard-setting/icps-and-comframe/`;
const IAIS_AP_URL = `${IAIS_BASE_URL}/publications/application-papers/`;
const IAIS_SITEMAP_URL = `${IAIS_BASE_URL}/sitemap.xml`;

const NAIC_BASE_URL = "https://content.naic.org";
const NAIC_MODELS_URL = `${NAIC_BASE_URL}/cipr_topics`;

const LLOYDS_BASE_URL = "https://www.lloyds.com";
const LLOYDS_BULLETINS_URL = `${LLOYDS_BASE_URL}/market-resources/market-bulletins`;

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
  "icps",
  "comframe",
  "application-paper",
  "application paper",
  "holistic framework",
  "insurance capital standard",
  "ics ",
  "cyber",
  "climate",
  "operational resilience",
  "conduct of business",
  "enterprise risk management",
  "capital adequacy",
  "group supervision",
  "group-wide supervision",
  "supervisory cooperation",
  "macroprudential",
  "recovery planning",
  "resolution",
  "liquidity risk",
  "corporate governance",
  "fair treatment",
  "artificial intelligence",
  "DEI",
  "money laundering",
  "supervisory colleges",
  "digital technology",
  "systemic risk",
  "market bulletin",
  "minimum standards",
];

// CLI flags
const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const force = args.includes("--force");
const limitIdx = args.indexOf("--limit");
const fetchLimit = limitIdx !== -1 ? parseInt(args[limitIdx + 1] ?? "999", 10) : 999;
const sourceIdx = args.indexOf("--source");
const sourceFilter = sourceIdx !== -1 ? (args[sourceIdx + 1] ?? "").toLowerCase() : "";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type SourceName = "iais" | "naic" | "lloyds";

interface DocumentLink {
  title: string;
  url: string;
  category: string;
  filename: string;
  source: SourceName;
}

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
          redirect: "follow",
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

function isInsuranceRelevant(urlOrTitle: string): boolean {
  const lower = urlOrTitle.toLowerCase();
  return INSURANCE_KEYWORDS.some((kw) => lower.includes(kw.toLowerCase()));
}

function cleanFilenameForTitle(url: string): string {
  const base = basename(url.split("?")[0] ?? url).replace(/\.pdf$/i, "");
  // Strip leading date prefix like 180629- or 210525-
  return base.replace(/^\d{6,8}-/, "").replace(/-/g, " ").trim();
}

function inferCategoryFromUrl(url: string): string {
  const lower = url.toLowerCase();
  if (lower.includes("icps-and-comframe") || /\/icp[-s]?\b|icp\.pdf/.test(lower)) {
    return "Insurance Core Principles";
  }
  if (lower.includes("application-paper") || lower.includes("application_paper")) {
    return "Application Papers";
  }
  if (lower.includes("comframe")) return "ComFrame";
  if (lower.includes("holistic-framework") || lower.includes("systemic-risk")) {
    return "Holistic Framework";
  }
  if (lower.includes("ics") || lower.includes("insurance-capital-standard")) {
    return "Insurance Capital Standard";
  }
  if (lower.includes("naic.org")) return "NAIC Model Laws";
  if (lower.includes("lloyds.com") || lower.includes("assets.lloyds.com")) {
    return "Lloyd's Market Requirements";
  }
  return "IAIS Supervisory Material";
}

// ---------------------------------------------------------------------------
// IAIS portal discovery
// ---------------------------------------------------------------------------

async function scrapeIaisSitemap(): Promise<DocumentLink[]> {
  console.log(`Discovering IAIS publications via sitemap: ${IAIS_SITEMAP_URL}`);
  const links: DocumentLink[] = [];

  try {
    const response = await fetchWithRetry(IAIS_SITEMAP_URL);
    const xml = await response.text();

    const pdfRegex = /<loc>(https:\/\/www\.iais\.org\/uploads\/[^<]+\.pdf)<\/loc>/gi;
    const seen = new Set<string>();
    let match: RegExpExecArray | null;
    while ((match = pdfRegex.exec(xml)) !== null) {
      const url = match[1]!;
      if (seen.has(url)) continue;
      seen.add(url);

      const filenameRaw = basename(url.split("?")[0] ?? url);
      if (!isInsuranceRelevant(filenameRaw) && !isInsuranceRelevant(url)) continue;

      // Filter out obvious non-standards: newsletters, press releases, QA docs,
      // consultation resolutions, stakeholder presentations, draft work-in-progress,
      // translations, MMoU admin, meeting agendas, etc.
      if (shouldSkipFilename(filenameRaw)) continue;

      const title = cleanFilenameForTitle(url);
      const category = inferCategoryFromUrl(url);
      const filename = `iais-${filenameRaw.toLowerCase()}`;

      links.push({ title, url, category, filename, source: "iais" });
    }
  } catch (err) {
    console.warn(
      `  Warning: IAIS sitemap scraping failed: ${err instanceof Error ? err.message : String(err)}`,
    );
  }

  return links;
}

const SKIP_PATTERNS = [
  "newsletter",
  "press-release",
  "press_release",
  "iais-mmou",
  "stakeholder-engagement",
  "year-in-review",
  "gimar",
  "targeted-jurisdictional",
  "summary-of-outcomes",
  "progress-monitoring",
  "cover-note",
  "members-and-stakeholders-comments",
  "resolution-of-public-consultation",
  "resolution-of-comments",
  "resolution-to-public",
  "summary-of-main",
  "public-consultation-comments",
  "public-consultation-questions",
  "compiled-comments",
  "main-comments-received",
  "draft-",
  "presentation-on",
  "presentation_on",
  "webinar-on",
  "webinar_on",
  "stakeholder-session",
  "stakeholder-meeting",
  "stakeholder_meeting",
  "comparison-table",
  "japanese-translation",
  "arabic-translation",
  "french-translation",
  "french190525",
  "espanol",
  "spanish",
  "chinese",
  "principles-and-standards-only",
  "-agenda-",
  "letter-",
  "roadmap",
  "press-briefing",
  "working-paper",
  "press conference",
  "fsi-iais",
  "register",
  "ia-igs",
  "iaigs",
  "annexes",
  "section-",
  "explanatory-note",
  "technical-note",
  "high-level-messages",
  "draft_",
];

function shouldSkipFilename(filenameRaw: string): boolean {
  const lower = filenameRaw.toLowerCase();
  return SKIP_PATTERNS.some((p) => lower.includes(p));
}

async function scrapeIaisLivePages(): Promise<DocumentLink[]> {
  const pages: Array<{ url: string; defaultCategory: string }> = [
    { url: IAIS_ICP_URL, defaultCategory: "Insurance Core Principles" },
    { url: IAIS_AP_URL, defaultCategory: "Application Papers" },
  ];
  const links: DocumentLink[] = [];
  const seen = new Set<string>();

  for (const { url: pageUrl, defaultCategory } of pages) {
    console.log(`Scanning IAIS page: ${pageUrl}`);
    try {
      const response = await fetchWithRetry(pageUrl);
      const html = await response.text();

      const anchorRegex = /href="(https:\/\/www\.iais\.org\/uploads\/[^"]+\.pdf)"/gi;
      let match: RegExpExecArray | null;
      while ((match = anchorRegex.exec(html)) !== null) {
        const url = match[1]!;
        if (seen.has(url)) continue;
        seen.add(url);

        const filenameRaw = basename(url.split("?")[0] ?? url);
        if (!isInsuranceRelevant(filenameRaw) && !isInsuranceRelevant(url)) continue;
        if (shouldSkipFilename(filenameRaw)) continue;

        const title = cleanFilenameForTitle(url);
        const category = inferCategoryFromUrl(url) || defaultCategory;
        const filename = `iais-${filenameRaw.toLowerCase()}`;
        links.push({ title, url, category, filename, source: "iais" });
      }
    } catch (err) {
      console.warn(
        `  Warning: page scan failed (${pageUrl}): ${err instanceof Error ? err.message : String(err)}`,
      );
    }
    await sleep(RATE_LIMIT_MS);
  }

  return links;
}

// ---------------------------------------------------------------------------
// NAIC: attempt discovery; gracefully handle 403 auth wall
// ---------------------------------------------------------------------------

async function probeNaic(): Promise<{ reachable: boolean; status: number; note: string }> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    const response = await fetch(NAIC_MODELS_URL, {
      headers: { "User-Agent": USER_AGENT },
      signal: controller.signal,
      redirect: "follow",
    });
    clearTimeout(timeoutId);
    return {
      reachable: response.ok,
      status: response.status,
      note: response.ok ? "accessible" : `HTTP ${response.status} — likely gated behind account registration`,
    };
  } catch (err) {
    return {
      reachable: false,
      status: 0,
      note: `fetch error: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}

// ---------------------------------------------------------------------------
// Lloyd's: known public bulletin URLs (JS-rendered listing, so hardcode a curated set)
// ---------------------------------------------------------------------------

function getLloydsKnownBulletins(): DocumentLink[] {
  // Lloyd's market bulletins are publicly accessible but served from a JS-rendered
  // listing. A stable curated set of high-interest bulletins is listed here. Each
  // is fetched and skipped on 404 so the pipeline proceeds without blocking.
  const bulletins: Array<{ id: string; title: string; path: string }> = [
    // Cyber risk bulletins
    {
      id: "y5381",
      title: "Lloyd's Market Bulletin Y5381 — State-Backed Cyber Attack Exclusions",
      path: "/resources/y5381",
    },
    {
      id: "y5258",
      title: "Lloyd's Market Bulletin Y5258 — Cyber Risk War and Infrastructure Exclusions",
      path: "/resources/y5258",
    },
  ];
  return bulletins.map((b) => ({
    title: b.title,
    url: `${LLOYDS_BASE_URL}${b.path}`,
    category: "Lloyd's Market Requirements",
    filename: `lloyds-${b.id}.pdf`,
    source: "lloyds" as SourceName,
  }));
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function dedupeLinks(links: DocumentLink[]): DocumentLink[] {
  const seen = new Set<string>();
  const out: DocumentLink[] = [];
  for (const l of links) {
    if (seen.has(l.url)) continue;
    seen.add(l.url);
    out.push(l);
  }
  return out;
}

async function main(): Promise<void> {
  if (!existsSync(RAW_DIR)) {
    mkdirSync(RAW_DIR, { recursive: true });
    console.log(`Created directory: ${RAW_DIR}`);
  }

  const sourceStatus: Record<SourceName, { status: string; notes: string; documents: number }> = {
    iais: { status: "unknown", notes: "", documents: 0 },
    naic: { status: "unknown", notes: "", documents: 0 },
    lloyds: { status: "unknown", notes: "", documents: 0 },
  };

  const wantSource = (s: SourceName): boolean => !sourceFilter || sourceFilter === s;

  // --- Discover IAIS documents -------------------------------------------
  let iaisLinks: DocumentLink[] = [];
  if (wantSource("iais")) {
    const sitemapLinks = await scrapeIaisSitemap();
    const pageLinks = await scrapeIaisLivePages();
    iaisLinks = dedupeLinks([...pageLinks, ...sitemapLinks]);
    sourceStatus.iais.documents = iaisLinks.length;
    sourceStatus.iais.status = iaisLinks.length > 0 ? "available" : "empty";
    sourceStatus.iais.notes = `Scraped iais.org sitemap (${sitemapLinks.length}) + live pages (${pageLinks.length}).`;
    console.log(`  IAIS discovered: ${iaisLinks.length} documents`);
  }

  // --- Probe NAIC ---------------------------------------------------------
  let naicLinks: DocumentLink[] = [];
  if (wantSource("naic")) {
    const probe = await probeNaic();
    sourceStatus.naic.status = probe.reachable ? "available" : "gated";
    sourceStatus.naic.notes = probe.note;
    console.log(`  NAIC probe: HTTP ${probe.status} — ${probe.note}`);
    if (!probe.reachable) {
      console.log("  NAIC model laws require account registration. Skipping (documented gap).");
    }
    // If reachable we would populate naicLinks here, but most NAIC model-law PDFs
    // are behind member login. We intentionally do not try to bypass.
  }

  // --- Lloyd's (known bulletin set, best-effort) -------------------------
  let lloydsLinks: DocumentLink[] = [];
  if (wantSource("lloyds")) {
    lloydsLinks = getLloydsKnownBulletins();
    sourceStatus.lloyds.documents = lloydsLinks.length;
    sourceStatus.lloyds.status = "best-effort";
    sourceStatus.lloyds.notes =
      "Lloyd's bulletin listing is JS-rendered; using curated known-bulletin set. " +
      "Individual bulletin URLs may 404 if retired — skipped gracefully.";
    console.log(`  Lloyd's curated bulletins: ${lloydsLinks.length} candidates`);
  }

  let documents = dedupeLinks([...iaisLinks, ...naicLinks, ...lloydsLinks]);
  console.log(`\nTotal discovered: ${documents.length} insurance-regulatory documents`);

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
  let errors = 0;

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
      errors++;
    }

    if (i < documents.length - 1) {
      await sleep(RATE_LIMIT_MS);
    }
  }

  const perSourceFetched: Record<string, number> = {};
  for (const f of fetched) {
    perSourceFetched[f.source] = (perSourceFetched[f.source] ?? 0) + 1;
  }

  const summary = {
    fetchedAt: new Date().toISOString(),
    total: documents.length,
    fetched: fetched.length,
    skipped,
    errors,
    sourceStatus,
    perSourceFetched,
    documents: fetched.map((d) => ({
      title: d.title,
      filename: d.filename,
      category: d.category,
      source: d.source,
      textLength: d.text.length,
    })),
  };

  writeFileSync(join(RAW_DIR, "fetch-summary.json"), JSON.stringify(summary, null, 2), "utf8");
  console.log(`\nFetch complete: ${fetched.length} fetched, ${skipped} skipped, ${errors} errors`);
  console.log(`Per-source fetched: ${JSON.stringify(perSourceFetched)}`);
  console.log(`Source status: ${JSON.stringify(sourceStatus, null, 2)}`);
  console.log(`Summary written to ${join(RAW_DIR, "fetch-summary.json")}`);
}

main().catch((err) => {
  console.error("Fatal error:", err instanceof Error ? err.message : String(err));
  process.exit(1);
});
