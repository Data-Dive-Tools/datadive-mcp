import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { listBlindSpendAlertsTool } from "../../src/tools/list-blind-spend-alerts.js";
import { CTX, mockFetch, getCallUrl } from "./_helpers.js";

describe("list_blind_spend_alerts tool", () => {
  let originalFetch: typeof fetch;
  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });
  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("sends only provided query params; skips undefined", async () => {
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

    await listBlindSpendAlertsTool.handler(
      { marketplace: "co.uk", updatedSince: "2026-05-01T00:00:00Z", pageSize: 50 },
      CTX,
    );
    const url = new URL(getCallUrl(fetchMock));
    expect(url.pathname).toBe("/v1/alerts/blind-spend");
    expect(url.searchParams.get("marketplace")).toBe("co.uk");
    expect(url.searchParams.get("updatedSince")).toBe("2026-05-01T00:00:00Z");
    expect(url.searchParams.get("pageSize")).toBe("50");
    expect(url.searchParams.has("sellerId")).toBe(false);
    expect(url.searchParams.has("status")).toBe(false);
  });

  it("passes the bare pagination body through unchanged, including nested searchTerms", async () => {
    const body = {
      data: [
        {
          id: 12345,
          asin: "B0ABCDEFGH",
          title: "Wireless Earbuds, Bluetooth 5.3",
          imageUrl: null,
          sellerId: "A1B2C3D4E5",
          marketplace: "com",
          lastAlertedAt: "2026-06-01T12:00:00Z",
          resolvedAt: null,
          wastedSpend: 246.9,
          totalKeywordCount: 8,
          unresolvedKeywordCount: 5,
          searchTerms: [
            { term: "wireless earbuds bluetooth", spend: 123.45, sales: 0, clicks: 15, cvr: 0, impressions: 1500 },
          ],
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

    const result = await listBlindSpendAlertsTool.handler({}, CTX);
    expect(result).toEqual(body);
  });

  it("rejects an invalid status enum value at the schema level", () => {
    const schema = listBlindSpendAlertsTool.inputSchema;
    expect(() => schema.status.parse("BANANA")).toThrow();
    expect(schema.status.parse("all")).toBe("all");
  });

  it("rejects pageSize above the API cap of 50", () => {
    const schema = listBlindSpendAlertsTool.inputSchema;
    expect(() => schema.pageSize.parse(51)).toThrow();
    expect(schema.pageSize.parse(50)).toBe(50);
  });

  it("rejects an empty or unsupported marketplace at the schema level", () => {
    const schema = listBlindSpendAlertsTool.inputSchema;
    expect(() => schema.marketplace.parse("")).toThrow();
    expect(() => schema.marketplace.parse("xyz")).toThrow();
    expect(schema.marketplace.parse("com")).toBe("com");
  });

  it("rejects a non-ISO-8601 updatedSince at the schema level", () => {
    const schema = listBlindSpendAlertsTool.inputSchema;
    expect(() => schema.updatedSince.parse("")).toThrow();
    expect(() => schema.updatedSince.parse("last week")).toThrow();
    expect(schema.updatedSince.parse("2026-05-01")).toBe("2026-05-01");
    expect(schema.updatedSince.parse("2026-05-01T00:00:00Z")).toBe("2026-05-01T00:00:00Z");
  });
});
