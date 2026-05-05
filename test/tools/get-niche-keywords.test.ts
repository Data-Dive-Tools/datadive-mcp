import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { getNicheKeywordsTool } from "../../src/tools/get-niche-keywords.js";
import { CTX, mockFetch, getCallUrl } from "./_helpers.js";

describe("get_niche_keywords tool", () => {
  let originalFetch: typeof fetch;
  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });
  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("URL-encodes the nicheId path param", async () => {
    const fetchMock = mockFetch({ data: { keywords: [], latestResearchDate: "2024-01-01" } });
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    await getNicheKeywordsTool.handler({ nicheId: "z 1/abc" }, CTX);
    expect(getCallUrl(fetchMock)).toBe("https://api.datadive.tools/v1/niches/z%201%2Fabc/keywords");
  });

  it("unwraps ResponseDto envelope", async () => {
    const inner = {
      keywords: [
        { keyword: "dog hat", searchVolume: 1234, relevancy: 0.8, asinRanks: { B0001: 1, B0002: null } },
      ],
      latestResearchDate: "2024-03-26",
    };
    globalThis.fetch = mockFetch({ data: inner }) as unknown as typeof fetch;

    const result = await getNicheKeywordsTool.handler({ nicheId: "abc" }, CTX);
    expect(result).toEqual(inner);
  });
});
