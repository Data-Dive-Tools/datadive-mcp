import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { listIndexingIssueAlertsTool } from "../../src/tools/list-indexing-issue-alerts.js";
import { CTX, mockFetch, getCallUrl } from "./_helpers.js";

describe("list_indexing_issue_alerts tool", () => {
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

    await listIndexingIssueAlertsTool.handler({ sellerId: "A1B2C3D4E5", status: "resolved" }, CTX);
    const url = new URL(getCallUrl(fetchMock));
    expect(url.pathname).toBe("/v1/alerts/indexing-issues");
    expect(url.searchParams.get("sellerId")).toBe("A1B2C3D4E5");
    expect(url.searchParams.get("status")).toBe("resolved");
    expect(url.searchParams.has("marketplace")).toBe(false);
    expect(url.searchParams.has("updatedSince")).toBe(false);
    expect(url.searchParams.has("currentPage")).toBe(false);
  });

  it("passes the bare pagination body through unchanged", async () => {
    const body = {
      data: [
        {
          id: 12345,
          asin: "B0ABCDEFGH",
          title: "Wireless Earbuds, Bluetooth 5.3",
          imageUrl: "https://m.media-amazon.com/images/I/abc.jpg",
          isParent: false,
          sellerId: "A1B2C3D4E5",
          marketplace: "com",
          lastAlertedAt: "2026-06-01T12:00:00Z",
          resolvedAt: null,
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

    const result = await listIndexingIssueAlertsTool.handler({}, CTX);
    expect(result).toEqual(body);
  });

  it("rejects an invalid status enum value at the schema level", () => {
    const schema = listIndexingIssueAlertsTool.inputSchema;
    expect(() => schema.status.parse("dismissed")).toThrow();
    expect(schema.status.parse("active")).toBe("active");
  });

  it("rejects an empty or unsupported marketplace at the schema level", () => {
    const schema = listIndexingIssueAlertsTool.inputSchema;
    expect(() => schema.marketplace.parse("")).toThrow();
    expect(() => schema.marketplace.parse("xyz")).toThrow();
    expect(schema.marketplace.parse("co.uk")).toBe("co.uk");
  });

  it("rejects a non-ISO-8601 updatedSince at the schema level", () => {
    const schema = listIndexingIssueAlertsTool.inputSchema;
    expect(() => schema.updatedSince.parse("")).toThrow();
    expect(() => schema.updatedSince.parse("last week")).toThrow();
    expect(schema.updatedSince.parse("2026-05-01")).toBe("2026-05-01");
    expect(schema.updatedSince.parse("2026-05-01T00:00:00Z")).toBe("2026-05-01T00:00:00Z");
  });
});
