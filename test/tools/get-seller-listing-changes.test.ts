import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { getSellerListingChangesTool } from "../../src/tools/get-seller-listing-changes.js";
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

describe("get_seller_listing_changes tool", () => {
  let originalFetch: typeof fetch;
  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });
  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("URL-encodes the sellerId and marketplace path params", async () => {
    const fetchMock = mockFetch(emptyPage);
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    await getSellerListingChangesTool.handler({ sellerId: "A1 / B2", marketplace: "de" }, CTX);
    expect(getCallUrl(fetchMock)).toBe(
      "https://api.datadive.tools/v1/seller_profiles/A1%20%2F%20B2/marketplaces/de/listing-changes",
    );
  });

  it("serializes the types array as a comma-joined param", async () => {
    const fetchMock = mockFetch(emptyPage);
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    await getSellerListingChangesTool.handler(
      { sellerId: "A1B2C3", marketplace: "com", types: ["Price", "Image"] },
      CTX,
    );
    expect(getCallUrl(fetchMock)).toBe(
      "https://api.datadive.tools/v1/seller_profiles/A1B2C3/marketplaces/com/listing-changes?types=Price%2CImage",
    );
  });

  it("forwards date, sort, and correlation filters", async () => {
    const fetchMock = mockFetch(emptyPage);
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    await getSellerListingChangesTool.handler(
      {
        sellerId: "A1B2C3",
        marketplace: "com",
        startDate: "2026-05-01",
        endDate: "2026-05-31",
        sortBy: "type",
        sortOrder: "ASC",
        includeCorrelations: true,
      },
      CTX,
    );
    expect(getCallUrl(fetchMock)).toBe(
      "https://api.datadive.tools/v1/seller_profiles/A1B2C3/marketplaces/com/listing-changes?startDate=2026-05-01&endDate=2026-05-31&sortBy=type&sortOrder=ASC&includeCorrelations=true",
    );
  });
});
