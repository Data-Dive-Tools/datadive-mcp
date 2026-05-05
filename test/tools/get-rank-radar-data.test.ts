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

  it("calls the rankRadarId path with startDate/endDate query", async () => {
    const fetchMock = mockFetch({ success: true, data: [] });
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
