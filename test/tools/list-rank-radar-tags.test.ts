import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { listRankRadarTagsTool } from "../../src/tools/list-rank-radar-tags.js";
import { CTX, mockFetch, getCallUrl } from "./_helpers.js";

const RR_ID = "3f4a1c2e-5b6d-4e7f-8a9b-0c1d2e3f4a5b";

const PAGE = {
  data: [
    {
      id: "aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa",
      title: "Promo week",
      color: "#C9CFD7",
      description: null,
      startAt: null,
      endAt: null,
      keywordCount: 3,
      createdAt: "2026-10-10T00:00:00.000Z",
    },
  ],
  currentPage: 1,
  pageSize: 20,
  total: 1,
  lastPage: 1,
  hasNext: false,
  hasPrev: false,
};

describe("list_rank_radar_tags tool", () => {
  let originalFetch: typeof fetch;
  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });
  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("GETs /v1/niches/rank-radars/:rankRadarId/tags with pagination", async () => {
    const fetchMock = mockFetch(PAGE);
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const result = await listRankRadarTagsTool.handler({ rankRadarId: RR_ID, currentPage: 2, pageSize: 10 }, CTX);

    const url = new URL(getCallUrl(fetchMock));
    expect(url.pathname).toBe(`/v1/niches/rank-radars/${RR_ID}/tags`);
    expect(url.searchParams.get("currentPage")).toBe("2");
    expect(url.searchParams.get("pageSize")).toBe("10");
    expect(result).toEqual(PAGE);
  });

  it("returns the bare paginated body (not an envelope-unwrapped one)", async () => {
    const fetchMock = mockFetch(PAGE);
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const result = await listRankRadarTagsTool.handler({ rankRadarId: RR_ID }, CTX);

    expect(result).toHaveProperty("data");
    expect(result).toHaveProperty("currentPage");
    expect(result).toHaveProperty("hasNext");
  });

  it("rejects a non-UUID rankRadarId at the schema level", () => {
    expect(() => listRankRadarTagsTool.inputSchema.rankRadarId.parse("not-a-uuid")).toThrow();
    expect(listRankRadarTagsTool.inputSchema.rankRadarId.parse(RR_ID)).toBe(RR_ID);
  });

  it("rejects a pageSize beyond the max", () => {
    expect(() => listRankRadarTagsTool.inputSchema.pageSize.parse(51)).toThrow();
    expect(listRankRadarTagsTool.inputSchema.pageSize.parse(50)).toBe(50);
  });
});
