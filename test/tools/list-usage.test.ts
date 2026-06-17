import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { listUsageTool } from "../../src/tools/list-usage.js";
import { CTX, mockFetch, getCallUrl } from "./_helpers.js";

function paginatedBody(data: unknown[]) {
  return { data, currentPage: 1, pageSize: 50, total: data.length, lastPage: 1, hasNext: false, hasPrev: false };
}

describe("list_usage tool", () => {
  let originalFetch: typeof fetch;
  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });
  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("sends provided filter params and skips undefined", async () => {
    const fetchMock = mockFetch(paginatedBody([]));
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    await listUsageTool.handler(
      { type: "DIVED_ASINS", search: "john", startDate: "2026-05-01", endDate: "2026-05-31", pageSize: 200 },
      CTX,
    );
    const url = new URL(getCallUrl(fetchMock));
    expect(url.pathname).toBe("/v1/usage");
    expect(url.searchParams.get("type")).toBe("DIVED_ASINS");
    expect(url.searchParams.get("search")).toBe("john");
    expect(url.searchParams.get("startDate")).toBe("2026-05-01");
    expect(url.searchParams.get("endDate")).toBe("2026-05-31");
    expect(url.searchParams.get("pageSize")).toBe("200");
    expect(url.searchParams.has("currentPage")).toBe(false);
  });

  it("passes the bare pagination body through unchanged", async () => {
    const body = paginatedBody([
      {
        name: "John Doe",
        email: "john@example.com",
        qty: 5,
        type: "RANK_RADAR_KEYWORDS",
        action: "RANK_RADAR_CREATE",
        nicheId: "boGkBnlEx4",
        nicheName: "dog hat",
        rankRadarId: "5231a9af-82f2-4c87-9ed4-cef0447cff1e",
        date: "2026-06-01T12:00:00Z",
      },
    ]);
    globalThis.fetch = mockFetch(body) as unknown as typeof fetch;

    const result = await listUsageTool.handler({}, CTX);
    expect(result).toEqual(body);
  });
});
