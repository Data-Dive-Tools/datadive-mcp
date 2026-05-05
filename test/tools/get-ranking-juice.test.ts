import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { getRankingJuiceTool } from "../../src/tools/get-ranking-juice.js";
import { CTX, mockFetch, getCallUrl } from "./_helpers.js";

describe("get_ranking_juice tool", () => {
  let originalFetch: typeof fetch;
  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });
  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("calls /v1/niches/:nicheId/ranking-juices and unwraps envelope", async () => {
    const inner = {
      currentListing: { rankingJuice: 100, title: { rankingJuice: 10 }, bullets: { rankingJuice: 50 }, description: { rankingJuice: 40 } },
      optimizedListing: { rankingJuice: 300, title: { rankingJuice: 30 }, bullets: { rankingJuice: 150 }, description: { rankingJuice: 120 } },
      competitors: [],
      latestResearchDate: "2024-05-01",
    };
    const fetchMock = mockFetch({ data: inner });
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const result = await getRankingJuiceTool.handler({ nicheId: "z1" }, CTX);
    expect(getCallUrl(fetchMock)).toBe("https://api.datadive.tools/v1/niches/z1/ranking-juices");
    expect(result).toEqual(inner);
  });
});
