/**
 * Opt-in smoke test: hits the real read-only list endpoints with a CI-provided key.
 *
 * Runs only via `npm run test:smoke` with DATADIVE_SMOKE_API_KEY set. Wire into the nightly job in
 * .github/workflows/ci.yml; do not run on every PR (would hit external API
 * unnecessarily and require sharing the key).
 */

import { describe, it, expect } from "vitest";
import { listNichesTool } from "../src/tools/list-niches.js";
import { getNicheRootsTool } from "../src/tools/get-niche-roots.js";
import { listIndexingIssueAlertsTool } from "../src/tools/list-indexing-issue-alerts.js";
import { listBlindSpendAlertsTool } from "../src/tools/list-blind-spend-alerts.js";
import { getQuotaTool } from "../src/tools/get-quota.js";
import { listUsageTool } from "../src/tools/list-usage.js";
import { listSellerProfilesTool } from "../src/tools/list-seller-profiles.js";
import { getSellerCatalogTool } from "../src/tools/get-seller-catalog.js";
import { getSellerListingChangesTool } from "../src/tools/get-seller-listing-changes.js";
import { BILLABLE_FEATURE_TYPES } from "../src/types/api.js";
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

describe.skipIf(!KEY)("smoke: /v1/niches/:nicheId/roots against staging", () => {
  it("get_niche_roots returns the roots tables for a real niche", async () => {
    const config = smokeConfig();
    const niches = (await listNichesTool.handler({ pageSize: 1 }, { config })) as PaginatedBody;
    const first = niches.data[0] as { nicheId?: string } | undefined;
    if (!first?.nicheId) {
      // QA account has no niches — nothing to dive into. Skip the shape assertion.
      console.warn("smoke: skipping get_niche_roots — no niches in this account");
      return;
    }

    const result = (await getNicheRootsTool.handler({ nicheId: first.nicheId }, { config })) as {
      roots: unknown;
      normalizedRoots: unknown;
      latestResearchDate: unknown;
    };
    // Envelope unwraps to a single object carrying the roots tables.
    // toBeTruthy() first — toBeTypeOf("object") alone passes for null.
    expect(result).toBeTruthy();
    expect(result).toBeTypeOf("object");
    expect(Array.isArray(result.roots)).toBe(true);
    expect(Array.isArray(result.normalizedRoots)).toBe(true);
  });
});

describe.skipIf(!KEY)("smoke: /v1/quota against staging", () => {
  it("get_quota returns per-feature usage and a refresh date", async () => {
    const result = (await getQuotaTool.handler({}, { config: smokeConfig() })) as {
      nextRefreshDate: unknown;
      features: Record<string, { used: unknown; capacity: unknown }>;
    };
    expect(result).toHaveProperty("nextRefreshDate");
    // toBeTruthy() first — toBeTypeOf("object") alone passes for null.
    expect(result.features).toBeTruthy();
    expect(result.features).toBeTypeOf("object");
    // Every billable feature key is present, each with used/capacity.
    for (const feature of BILLABLE_FEATURE_TYPES) {
      expect(result.features[feature]).toHaveProperty("used");
      expect(result.features[feature]).toHaveProperty("capacity");
    }
  });
});

describe.skipIf(!KEY)("smoke: /v1/usage against staging", () => {
  it("list_usage returns a paginated body", async () => {
    const result = (await listUsageTool.handler({ pageSize: 1 }, { config: smokeConfig() })) as PaginatedBody;
    expect(Array.isArray(result.data)).toBe(true);
    expect(result.currentPage).toBe(1);
    expect(result.pageSize).toBe(1);
  });
});

describe.skipIf(!KEY)("smoke: /v1/seller_profiles against staging", () => {
  it("list_seller_profiles returns a paginated body, then catalog + listing-changes for a real seller", async () => {
    const config = smokeConfig();
    const profiles = (await listSellerProfilesTool.handler({ pageSize: 1 }, { config })) as PaginatedBody;
    expect(Array.isArray(profiles.data)).toBe(true);
    expect(profiles.currentPage).toBe(1);
    expect(profiles.pageSize).toBe(1);

    const first = profiles.data[0] as { sellerId?: string; marketplace?: string } | undefined;
    if (!first?.sellerId || !first.marketplace) {
      // QA account has no connected seller profiles — nothing to scope into.
      console.warn("smoke: skipping get_seller_catalog/listing-changes — no seller profiles in this account");
      return;
    }

    const args = { sellerId: first.sellerId, marketplace: first.marketplace as never, pageSize: 1 };
    const catalog = (await getSellerCatalogTool.handler(args, { config })) as PaginatedBody;
    expect(Array.isArray(catalog.data)).toBe(true);
    expect(catalog.pageSize).toBe(1);

    const changes = (await getSellerListingChangesTool.handler(args, { config })) as PaginatedBody;
    expect(Array.isArray(changes.data)).toBe(true);
    expect(changes.pageSize).toBe(1);
  });
});

describe.skipIf(KEY)("smoke (skipped — run via `npm run test:smoke` with DATADIVE_SMOKE_API_KEY set)", () => {
  it("placeholder so the file shows up in test output", () => {
    expect(true).toBe(true);
  });
});
