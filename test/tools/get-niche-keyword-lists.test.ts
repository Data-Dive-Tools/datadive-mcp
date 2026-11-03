import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  getNicheOutlierKeywordsTool,
  getNicheResidueKeywordsTool,
} from "../../src/tools/get-niche-keyword-lists.js";
import { CTX, mockFetch, getCallUrl } from "./_helpers.js";

const PAGE = {
  data: [
    {
      keyword: "dog hat",
      searchVolume: 1234,
      relevancy: 0.2,
      asinRanks: { B0001: 3 },
      suggestedBid: { min: 101, max: 886, median: 445 },
    },
  ],
  currentPage: 2,
  pageSize: 50,
  total: 51,
  lastPage: 2,
  hasNext: false,
  hasPrev: true,
  latestResearchDate: "2026-10-01",
};

describe.each([
  [getNicheOutlierKeywordsTool, "outlier_keywords"],
  [getNicheResidueKeywordsTool, "residue_keywords"],
])("$name tool", (tool, list) => {
  let originalFetch: typeof fetch;
  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });
  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("calls the list route with the page params and URL-encodes the nicheId", async () => {
    const fetchMock = mockFetch({ data: PAGE });
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    await tool.handler({ nicheId: "z 1/abc", currentPage: 2, pageSize: 50 }, CTX);
    expect(getCallUrl(fetchMock)).toBe(
      `https://api.datadive.tools/v1/niches/z%201%2Fabc/${list}?currentPage=2&pageSize=50`,
    );
  });

  it("omits page params that were not given and unwraps the envelope", async () => {
    const fetchMock = mockFetch({ data: PAGE });
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const result = await tool.handler({ nicheId: "abc" }, CTX);
    expect(getCallUrl(fetchMock)).toBe(`https://api.datadive.tools/v1/niches/abc/${list}`);
    expect(result).toEqual(PAGE);
  });

  it("rejects a page size over the API's maximum", () => {
    expect(tool.inputSchema.pageSize.safeParse(101).success).toBe(false);
  });
});
