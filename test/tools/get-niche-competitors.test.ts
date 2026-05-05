import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { getNicheCompetitorsTool } from "../../src/tools/get-niche-competitors.js";
import { CTX, mockFetch, getCallUrl } from "./_helpers.js";

describe("get_niche_competitors tool", () => {
  let originalFetch: typeof fetch;
  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });
  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("calls /v1/niches/:nicheId/competitors", async () => {
    const fetchMock = mockFetch({
      data: {
        marketplace: "com",
        statistics: {},
        opportunityEvaluation: {},
        benchmark: {},
        competitorsStrength: {},
        competitors: [{ asin: "B0001", sales: 100 }],
        latestResearchDate: "2024-04-01",
      },
    });
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const result = await getNicheCompetitorsTool.handler({ nicheId: "z515cGOFg3" }, CTX);
    expect(getCallUrl(fetchMock)).toBe("https://api.datadive.tools/v1/niches/z515cGOFg3/competitors");
    expect((result as { competitors: unknown[] }).competitors).toHaveLength(1);
  });
});
