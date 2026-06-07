import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { listIndexingIssueAlertsTool } from "../../src/tools/list-indexing-issue-alerts.js";
import { alertsQueryInputSchema } from "../../src/tools/alert-query.js";
import { CTX, mockFetch, getCallUrl } from "./_helpers.js";

describe("list_indexing_issue_alerts tool", () => {
  let originalFetch: typeof fetch;
  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });
  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("uses the shared alerts query schema (validation rules covered in alert-query.test.ts)", () => {
    expect(listIndexingIssueAlertsTool.inputSchema).toBe(alertsQueryInputSchema);
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
});
