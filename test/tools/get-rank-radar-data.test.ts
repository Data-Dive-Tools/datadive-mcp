import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { z } from "zod";
import { getRankRadarDataTool } from "../../src/tools/get-rank-radar-data.js";
import { CTX, mockFetch, getCallUrl } from "./_helpers.js";

describe("get_rank_radar_data tool", () => {
  let originalFetch: typeof fetch;
  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });
  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  const validUuid = "11111111-1111-4111-8111-111111111111";

  const PAGE = {
    data: [
      {
        id: "22222222-2222-4222-8222-222222222222",
        keyword: "protein powder",
        searchVolume: 1000,
        relevancy: 0.5,
        ranks: [{ date: "2024-03-26", organicRank: 4, sponsoredRank: 1, impressionRank: null }],
        adData: null,
        sqpData: null,
        highlights: [],
      },
    ],
    currentPage: 1,
    pageSize: 20,
    total: 21,
    lastPage: 2,
    hasNext: true,
    hasPrev: false,
  };

  it("calls the rankRadarId path with startDate/endDate query", async () => {
    const fetchMock = mockFetch({ success: true, data: PAGE });
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    await getRankRadarDataTool.handler(
      { rankRadarId: validUuid, startDate: "2024-03-26", endDate: "2024-04-26" },
      CTX,
    );
    const url = new URL(getCallUrl(fetchMock));
    expect(url.pathname).toBe(`/v1/niches/rank-radars/${validUuid}`);
    expect(url.searchParams.get("startDate")).toBe("2024-03-26");
    expect(url.searchParams.get("endDate")).toBe("2024-04-26");
  });

  it("forwards currentPage and pageSize, and omits them when unset", async () => {
    const fetchMock = mockFetch({ success: true, data: PAGE });
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    await getRankRadarDataTool.handler(
      { rankRadarId: validUuid, startDate: "2024-03-26", endDate: "2024-04-26", currentPage: 3, pageSize: 100 },
      CTX,
    );
    const paged = new URL(getCallUrl(fetchMock));
    expect(paged.searchParams.get("currentPage")).toBe("3");
    expect(paged.searchParams.get("pageSize")).toBe("100");

    const defaultMock = mockFetch({ success: true, data: PAGE });
    globalThis.fetch = defaultMock as unknown as typeof fetch;
    await getRankRadarDataTool.handler({ rankRadarId: validUuid, startDate: "2024-03-26", endDate: "2024-04-26" }, CTX);
    const unpaged = new URL(getCallUrl(defaultMock));
    expect(unpaged.searchParams.has("currentPage")).toBe(false);
    expect(unpaged.searchParams.has("pageSize")).toBe(false);
  });

  it("returns the paging envelope from inside the ResponseDto wrapper", async () => {
    globalThis.fetch = mockFetch({ success: true, data: PAGE }) as unknown as typeof fetch;

    const result = await getRankRadarDataTool.handler(
      { rankRadarId: validUuid, startDate: "2024-03-26", endDate: "2024-04-26" },
      CTX,
    );
    expect(result).toEqual(PAGE);
  });

  it("caps pageSize at the API's maximum, which would otherwise fall back to 20 silently", () => {
    const schema = z.object(getRankRadarDataTool.inputSchema);
    const base = { rankRadarId: validUuid, startDate: "2024-03-26", endDate: "2024-04-26" };
    expect(() => schema.parse({ ...base, pageSize: 100 })).not.toThrow();
    expect(() => schema.parse({ ...base, pageSize: 101 })).toThrow();
    expect(() => schema.parse({ ...base, pageSize: 0 })).toThrow();
    expect(() => schema.parse({ ...base, currentPage: 0 })).toThrow();
  });

  it("rejects malformed dates at the schema level", () => {
    const schema = z.object(getRankRadarDataTool.inputSchema);
    expect(() => schema.parse({ rankRadarId: validUuid, startDate: "2024-3-26", endDate: "2024-04-26" })).toThrow();
    expect(() => schema.parse({ rankRadarId: validUuid, startDate: "march 26", endDate: "2024-04-26" })).toThrow();
  });

  it("rejects non-UUID rankRadarId", () => {
    const schema = z.object(getRankRadarDataTool.inputSchema);
    expect(() => schema.parse({ rankRadarId: "abc", startDate: "2024-03-26", endDate: "2024-04-26" })).toThrow();
  });
});
