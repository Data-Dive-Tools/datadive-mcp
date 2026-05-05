/**
 * Opt-in smoke test: hits the real /v1/niches endpoint with a CI-provided key.
 *
 * Skipped unless DATADIVE_SMOKE_API_KEY is set. Wire into the nightly job in
 * .github/workflows/ci.yml; do not run on every PR (would hit external API
 * unnecessarily and require sharing the key).
 */

import { describe, it, expect } from "vitest";
import { listNichesTool } from "../src/tools/list-niches.js";
import { loadConfig } from "../src/config.js";

const KEY = process.env.DATADIVE_SMOKE_API_KEY;

describe.skipIf(!KEY)("smoke: /v1/niches against staging", () => {
  it("list_niches returns a paginated body", async () => {
    const config = loadConfig({
      DATADIVE_API_KEY: KEY,
      DATADIVE_API_BASE_URL: process.env.DATADIVE_API_BASE_URL ?? "https://api.datadive.tools",
    });
    const result = (await listNichesTool.handler({ pageSize: 1 }, { config })) as {
      data: unknown[];
      currentPage: number;
      pageSize: number;
    };
    expect(Array.isArray(result.data)).toBe(true);
    expect(result.currentPage).toBe(1);
    expect(result.pageSize).toBe(1);
  });
});

describe.skipIf(KEY)("smoke (skipped — DATADIVE_SMOKE_API_KEY not set)", () => {
  it("placeholder so the file shows up in test output", () => {
    expect(true).toBe(true);
  });
});
