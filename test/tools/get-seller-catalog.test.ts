import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { getSellerCatalogTool } from "../../src/tools/get-seller-catalog.js";
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

describe("get_seller_catalog tool", () => {
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

    await getSellerCatalogTool.handler({ sellerId: "A1 / B2", marketplace: "co.uk" }, CTX);
    expect(getCallUrl(fetchMock)).toBe(
      "https://api.datadive.tools/v1/seller_profiles/A1%20%2F%20B2/marketplaces/co.uk/catalog",
    );
  });

  it("forwards search, brand, and status filters; omits undefined params", async () => {
    const fetchMock = mockFetch(emptyPage);
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    await getSellerCatalogTool.handler(
      { sellerId: "A1B2C3", marketplace: "com", search: "widget", brand: "Acme", status: "all" },
      CTX,
    );
    expect(getCallUrl(fetchMock)).toBe(
      "https://api.datadive.tools/v1/seller_profiles/A1B2C3/marketplaces/com/catalog?search=widget&brand=Acme&status=all",
    );
  });

  it("passes the PaginationResponse body through unchanged", async () => {
    const body = {
      data: [
        {
          asin: "B08XYZ1234",
          title: "Widget",
          parentAsin: null,
          brand: "Acme",
          status: "Active",
          imageUrl: null,
          hasVariations: false,
        },
      ],
      currentPage: 1,
      pageSize: 20,
      total: 1,
      lastPage: 1,
      hasNext: false,
      hasPrev: false,
    };
    globalThis.fetch = mockFetch(body) as unknown as typeof fetch;

    const result = await getSellerCatalogTool.handler(
      { sellerId: "A1B2C3", marketplace: "com" },
      CTX,
    );
    expect(result).toEqual(body);
  });
});
