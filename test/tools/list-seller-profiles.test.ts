import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { listSellerProfilesTool } from "../../src/tools/list-seller-profiles.js";
import { CTX, mockFetch, getCallUrl } from "./_helpers.js";

describe("list_seller_profiles tool", () => {
  let originalFetch: typeof fetch;
  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });
  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("hits /v1/seller_profiles with no query params by default", async () => {
    const fetchMock = mockFetch({
      data: [],
      currentPage: 1,
      pageSize: 20,
      total: 0,
      lastPage: 1,
      hasNext: false,
      hasPrev: false,
    });
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    await listSellerProfilesTool.handler({}, CTX);
    expect(getCallUrl(fetchMock)).toBe("https://api.datadive.tools/v1/seller_profiles");
  });

  it("forwards currentPage and pageSize as query params", async () => {
    const fetchMock = mockFetch({
      data: [],
      currentPage: 2,
      pageSize: 10,
      total: 0,
      lastPage: 1,
      hasNext: false,
      hasPrev: true,
    });
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    await listSellerProfilesTool.handler({ currentPage: 2, pageSize: 10 }, CTX);
    expect(getCallUrl(fetchMock)).toBe(
      "https://api.datadive.tools/v1/seller_profiles?currentPage=2&pageSize=10",
    );
  });

  it("passes the PaginationResponse body through unchanged", async () => {
    const body = {
      data: [
        {
          sellerId: "A1B2C3",
          sellerName: "Acme Co",
          marketplace: "com",
          hasAdApi: true,
          createdAt: "2026-01-15T00:00:00.000Z",
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

    const result = await listSellerProfilesTool.handler({}, CTX);
    expect(result).toEqual(body);
  });
});
