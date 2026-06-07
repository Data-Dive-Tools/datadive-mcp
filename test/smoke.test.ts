/**
 * Opt-in smoke test: hits the real read-only list endpoints with a CI-provided key.
 *
 * Runs only via `npm run test:smoke` with DATADIVE_SMOKE_API_KEY set. Wire into the nightly job in
 * .github/workflows/ci.yml; do not run on every PR (would hit external API
 * unnecessarily and require sharing the key).
 */

import { describe, it, expect } from "vitest";
import { listNichesTool } from "../src/tools/list-niches.js";
import { listIndexingIssueAlertsTool } from "../src/tools/list-indexing-issue-alerts.js";
import { listBlindSpendAlertsTool } from "../src/tools/list-blind-spend-alerts.js";
import { loadConfig } from "../src/config.js";

// Gate on the explicit opt-in flag (set by `npm run test:smoke`) in addition to
// the key, so a key exported in the user's shell profile doesn't turn every
// plain `npm test` into live API calls.
const KEY = process.env.DATADIVE_SMOKE === "1" ? process.env.DATADIVE_SMOKE_API_KEY : undefined;

function smokeConfig() {
  return loadConfig({
    DATADIVE_API_KEY: KEY,
    DATADIVE_API_BASE_URL: process.env.DATADIVE_API_BASE_URL ?? "https://api.datadive.tools",
  });
}

interface PaginatedBody {
  data: unknown[];
  currentPage: number;
  pageSize: number;
}

describe.skipIf(!KEY)("smoke: /v1/niches against staging", () => {
  it("list_niches returns a paginated body", async () => {
    const result = (await listNichesTool.handler({ pageSize: 1 }, { config: smokeConfig() })) as PaginatedBody;
    expect(Array.isArray(result.data)).toBe(true);
    expect(result.currentPage).toBe(1);
    expect(result.pageSize).toBe(1);
  });
});

describe.skipIf(!KEY)("smoke: /v1/alerts against staging", () => {
  it("list_indexing_issue_alerts returns a paginated body", async () => {
    const result = (await listIndexingIssueAlertsTool.handler(
      { pageSize: 1 },
      { config: smokeConfig() },
    )) as PaginatedBody;
    expect(Array.isArray(result.data)).toBe(true);
    expect(result.currentPage).toBe(1);
    expect(result.pageSize).toBe(1);
  });

  it("list_blind_spend_alerts returns a paginated body", async () => {
    const result = (await listBlindSpendAlertsTool.handler(
      { pageSize: 1 },
      { config: smokeConfig() },
    )) as PaginatedBody;
    expect(Array.isArray(result.data)).toBe(true);
    expect(result.currentPage).toBe(1);
    expect(result.pageSize).toBe(1);
  });
});

describe.skipIf(KEY)("smoke (skipped — run via `npm run test:smoke` with DATADIVE_SMOKE_API_KEY set)", () => {
  it("placeholder so the file shows up in test output", () => {
    expect(true).toBe(true);
  });
});
