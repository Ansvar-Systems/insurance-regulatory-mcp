/**
 * Smoke tests for the insurance-regulatory-mcp database layer.
 *
 * These run after `npm run ingest:full` (or against the shipped DB) and verify:
 *   - the database file exists
 *   - integrity check passes and journal mode is `delete` (single-file shipping)
 *   - db_metadata table is populated
 *   - non-trivial row counts across frameworks/controls/circulars
 *   - FTS5 search returns hits for terms expected in IAIS ICP corpus
 *   - public query helpers return the expected shape
 *   - get_insurance_standard reverse-lookup works for a known ICP reference
 */

import { describe, it, expect } from "vitest";
import { existsSync } from "node:fs";
import Database from "better-sqlite3";
import {
  getStats,
  getMetadata,
  listFrameworks,
  searchRegulations,
  searchControls,
  getControl,
} from "../src/db.js";

const DB_PATH = process.env["INSURANCE_DB_PATH"] ?? "data/insurance.db";

describe("insurance-regulatory database", () => {
  it("database file exists", () => {
    expect(existsSync(DB_PATH)).toBe(true);
  });

  it("integrity_check passes and journal_mode is delete (ships as single file)", () => {
    const db = new Database(DB_PATH, { readonly: true });
    try {
      const integrity = db.pragma("integrity_check") as Array<{
        integrity_check: string;
      }>;
      expect(integrity[0]?.integrity_check).toBe("ok");

      const journal = db.pragma("journal_mode") as Array<{
        journal_mode: string;
      }>;
      expect(journal[0]?.journal_mode).toBe("delete");
    } finally {
      db.close();
    }
  });

  it("db_metadata table is populated with required keys", () => {
    const meta = getMetadata();
    expect(meta["mcp_name"]).toBe("insurance-regulatory-mcp");
    expect(meta["built_at"]).toBeTruthy();
    expect(meta["frameworks_count"]).toBeTruthy();
    expect(meta["controls_count"]).toBeTruthy();
    expect(meta["circulars_count"]).toBeTruthy();
  });

  it("contains at least 30 total rows (frameworks + controls + circulars)", () => {
    const s = getStats();
    expect(s.frameworks).toBeGreaterThanOrEqual(1);
    expect(s.controls + s.circulars).toBeGreaterThanOrEqual(30);
  });

  it("lists frameworks with required fields", () => {
    const rows = listFrameworks();
    expect(rows.length).toBeGreaterThanOrEqual(1);
    const first = rows[0]!;
    expect(first.id).toBeTruthy();
    expect(first.name).toBeTruthy();
  });

  it("FTS search for 'capital' returns hits", () => {
    const hits = searchRegulations({ query: "capital", limit: 5 });
    expect(hits.length).toBeGreaterThanOrEqual(1);
    for (const h of hits) {
      expect(["control", "circular"]).toContain(h.type);
      expect(h.title).toBeTruthy();
      expect(h.reference).toBeTruthy();
    }
  });

  it("FTS search for 'governance' returns hits across controls or circulars", () => {
    const controlHits = searchControls({ query: "governance", limit: 5 });
    const merged = searchRegulations({ query: "governance", limit: 5 });
    expect(controlHits.length + merged.length).toBeGreaterThanOrEqual(1);
  });

  it("get_insurance_standard ICP-16 (Enterprise Risk Management) resolves", () => {
    const icp16 = getControl("ICP-16");
    expect(icp16).not.toBeNull();
    expect(icp16?.title).toMatch(/Enterprise Risk Management/i);
  });
});
