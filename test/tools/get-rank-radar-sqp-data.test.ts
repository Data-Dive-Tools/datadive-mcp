import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { z } from "zod";
import { getRankRadarSqpDataTool } from "../../src/tools/get-rank-radar-sqp-data.js";
import { CTX, mockFetch, getCallUrl } from "./_helpers.js";

const RR = "11111111-1111-4111-8111-111111111111";

// `/sqp` returns the page object at the top level, not inside `{ success, data }`.
const PAGE = {
  data: [
    {
      id: "22222222-2222-4222-8222-222222222222",
      keyword: "sourdough starter kit",
      numberOfDaysWithData: 27,
    },
  ],
  currentPage: 2,
  pageSize: 100,
  total: 171,
  lastPage: 2,
  hasNext: false,
  hasPrev: true,
};

describe("get_rank_radar_sqp_data tool", () => {
  let originalFetch: typeof fetch;
  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });
  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("calls the /sqp route with the date range and paging", async () => {
    const fetchMock = mockFetch(PAGE);
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    await getRankRadarSqpDataTool.handler(
      { rankRadarId: RR, startDate: "2026-08-25", endDate: "2026-09-24", currentPage: 2, pageSize: 100 },
      CTX,
    );
    const url = new URL(getCallUrl(fetchMock));
    expect(url.pathname).toBe(`/v1/niches/rank-radars/${RR}/sqp`);
    expect(Object.fromEntries(url.searchParams)).toEqual({
      startDate: "2026-08-25",
      endDate: "2026-09-24",
      currentPage: "2",
      pageSize: "100",
    });
  });

  it("returns the bare paging envelope unchanged", async () => {
    globalThis.fetch = mockFetch(PAGE) as unknown as typeof fetch;

    const result = await getRankRadarSqpDataTool.handler(
      { rankRadarId: RR, startDate: "2026-08-25", endDate: "2026-09-24" },
      CTX,
    );
    expect(result).toEqual(PAGE);
  });

  it("shares the keyword route limits: uuid id, yyyy-mm-dd dates, pageSize 1..100", () => {
    const schema = z.object(getRankRadarSqpDataTool.inputSchema);
    const base = { rankRadarId: RR, startDate: "2026-08-25", endDate: "2026-09-24" };
    expect(() => schema.parse(base)).not.toThrow();
    expect(() => schema.parse({ ...base, rankRadarId: "abc" })).toThrow();
    expect(() => schema.parse({ ...base, startDate: "2026-8-25" })).toThrow();
    expect(() => schema.parse({ ...base, pageSize: 101 })).toThrow();
  });
});
