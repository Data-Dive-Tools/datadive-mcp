import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { z } from "zod";
import { listPpcCampaignsTool } from "../../src/tools/list-ppc-campaigns.js";
import { ApiError } from "../../src/http/errors.js";
import { CTX, mockFetch, getCallUrl } from "./_helpers.js";

const emptyPage = {
  data: [],
  currentPage: 1,
  pageSize: 20,
  total: 0,
  lastPage: 1,
  hasNext: false,
  hasPrev: false,
};

describe("list_ppc_campaigns tool", () => {
  let originalFetch: typeof fetch;
  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });
  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("calls the seller-scoped campaign route with URL-encoded path params", async () => {
    const fetchMock = mockFetch(emptyPage);
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    await listPpcCampaignsTool.handler({ sellerId: "A1 / B2", marketplace: "co.uk" }, CTX);
    expect(getCallUrl(fetchMock)).toBe(
      "https://api.datadive.tools/v1/seller_profiles/A1%20%2F%20B2/marketplaces/co.uk/ppc/campaigns",
    );
  });

  it("forwards the filters, sort and paging", async () => {
    const fetchMock = mockFetch(emptyPage);
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    await listPpcCampaignsTool.handler(
      {
        sellerId: "A2UNS7WVWX7ZYF",
        marketplace: "com",
        startDate: "2026-08-25",
        endDate: "2026-09-24",
        parentAsin: "B0ABCDEFGH",
        search: "auto",
        includePlacements: false,
        sortBy: "spend",
        sortOrder: "DESC",
        state: "ENABLED",
        currentPage: 2,
        pageSize: 50,
      },
      CTX,
    );
    expect(Object.fromEntries(new URL(getCallUrl(fetchMock)).searchParams)).toEqual({
      startDate: "2026-08-25",
      endDate: "2026-09-24",
      parentAsin: "B0ABCDEFGH",
      search: "auto",
      includePlacements: "false",
      sortBy: "spend",
      sortOrder: "DESC",
      state: "ENABLED",
      currentPage: "2",
      pageSize: "50",
    });
  });

  it("refuses asin together with parentAsin without calling the API", async () => {
    const fetchMock = mockFetch(emptyPage);
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    await expect(
      listPpcCampaignsTool.handler(
        { sellerId: "A2UNS7WVWX7ZYF", marketplace: "com", asin: "B0AAAAAAAA", parentAsin: "B0BBBBBBBB" },
        CTX,
      ),
    ).rejects.toBeInstanceOf(ApiError);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("accepts the base and placement sort fields and enforces the API limits", () => {
    const schema = z.object(listPpcCampaignsTool.inputSchema);
    const base = { sellerId: "A2UNS7WVWX7ZYF", marketplace: "com" };
    for (const sortBy of ["spend", "acos", "tosImpressionShare", "tosSpend", "offAcos", "ppBidAdjustment"]) {
      expect(() => schema.parse({ ...base, sortBy })).not.toThrow();
    }
    // Off Amazon has no bid adjustment, so the API has no such sort column.
    expect(() => schema.parse({ ...base, sortBy: "offBidAdjustment" })).toThrow();
    expect(() => schema.parse({ ...base, search: "ab" })).toThrow();
    expect(() => schema.parse({ ...base, pageSize: 51 })).toThrow();
    expect(() => schema.parse({ ...base, state: "ARCHIVED" })).toThrow();
  });
});
