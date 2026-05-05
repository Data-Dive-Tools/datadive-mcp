import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { listRankRadarsTool } from "../../src/tools/list-rank-radars.js";
import { CTX, mockFetch, getCallUrl } from "./_helpers.js";

describe("list_rank_radars tool", () => {
  let originalFetch: typeof fetch;
  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });
  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("sends only provided query params; skips undefined", async () => {
    const fetchMock = mockFetch({
      data: {
        data: [],
        currentPage: 1,
        pageSize: 20,
        total: 0,
        lastPage: 1,
        hasNext: false,
        hasPrev: false,
      },
    });
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    await listRankRadarsTool.handler({ status: "ACTIVE", nicheId: "z1" }, CTX);
    const url = new URL(getCallUrl(fetchMock));
    expect(url.pathname).toBe("/v1/niches/rank-radars");
    expect(url.searchParams.get("status")).toBe("ACTIVE");
    expect(url.searchParams.get("nicheId")).toBe("z1");
    expect(url.searchParams.has("currentPage")).toBe(false);
    expect(url.searchParams.has("searchText")).toBe(false);
  });

  it("unwraps the outer envelope, preserves inner pagination", async () => {
    const inner = {
      data: [{ id: "rr-1", asin: { id: "a", krtId: "k", asin: "B0001" }, marketplace: "com", keywordCount: 100, title: "X", imageUrl: "", top10KW: 5, top10SV: 1000, top50KW: 10, top50SV: 5000 }],
      currentPage: 1,
      pageSize: 20,
      total: 1,
      lastPage: 1,
      hasNext: false,
      hasPrev: false,
    };
    globalThis.fetch = mockFetch({ data: inner }) as unknown as typeof fetch;

    const result = await listRankRadarsTool.handler({}, CTX);
    expect(result).toEqual(inner);
    expect((result as typeof inner).currentPage).toBe(1);
  });

  it("rejects an invalid status enum value at the schema level", () => {
    const schema = listRankRadarsTool.inputSchema;
    expect(() => schema.status.parse("BANANA")).toThrow();
    expect(schema.status.parse("ACTIVE")).toBe("ACTIVE");
  });
});
