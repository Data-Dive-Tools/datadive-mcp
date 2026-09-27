import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { z } from "zod";
import { getRankRadarPpcDataTool } from "../../src/tools/get-rank-radar-ppc-data.js";
import { CTX, mockFetch, getCallUrl } from "./_helpers.js";

const RR = "11111111-1111-4111-8111-111111111111";

const PAGE = {
  data: [
    {
      id: "22222222-2222-4222-8222-222222222222",
      keyword: "sourdough bread",
      sponsoredRank: 101,
      ppcSpend: 2.74,
    },
  ],
  currentPage: 1,
  pageSize: 20,
  total: 171,
  lastPage: 9,
  hasNext: true,
  hasPrev: false,
};

describe("get_rank_radar_ppc_data tool", () => {
  let originalFetch: typeof fetch;
  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });
  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("calls the /ppc route and forwards includeCampaigns", async () => {
    const fetchMock = mockFetch(PAGE);
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    await getRankRadarPpcDataTool.handler(
      { rankRadarId: RR, startDate: "2026-08-25", endDate: "2026-09-24", includeCampaigns: true },
      CTX,
    );
    const url = new URL(getCallUrl(fetchMock));
    expect(url.pathname).toBe(`/v1/niches/rank-radars/${RR}/ppc`);
    expect(url.searchParams.get("includeCampaigns")).toBe("true");
    expect(url.searchParams.has("currentPage")).toBe(false);
  });

  it("omits includeCampaigns when unset, leaving the API default (false)", async () => {
    const fetchMock = mockFetch(PAGE);
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const result = await getRankRadarPpcDataTool.handler(
      { rankRadarId: RR, startDate: "2026-08-25", endDate: "2026-09-24" },
      CTX,
    );
    expect(new URL(getCallUrl(fetchMock)).searchParams.has("includeCampaigns")).toBe(false);
    expect(result).toEqual(PAGE);
  });

  it("caps pageSize at 100", () => {
    const schema = z.object(getRankRadarPpcDataTool.inputSchema);
    const base = { rankRadarId: RR, startDate: "2026-08-25", endDate: "2026-09-24" };
    expect(() => schema.parse({ ...base, pageSize: 100 })).not.toThrow();
    expect(() => schema.parse({ ...base, pageSize: 101 })).toThrow();
  });
});
