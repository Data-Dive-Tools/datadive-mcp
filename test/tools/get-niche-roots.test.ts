import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { getNicheRootsTool } from "../../src/tools/get-niche-roots.js";
import { CTX, mockFetch, getCallUrl } from "./_helpers.js";

describe("get_niche_roots tool", () => {
  let originalFetch: typeof fetch;
  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });
  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("calls /v1/niches/:nicheId/roots and unwraps the envelope to the roots object", async () => {
    const inner = {
      keywords: [],
      consolidatedKeywords: [],
      roots: [{ root: "dog", frequency: 51, broadSearchVolume: 77188, broadSearchVolumeRatio: 0.7 }],
      normalizedRoots: [{ root: "dog", frequency: 51, broadSearchVolume: 77188, broadSearchVolumeRatio: 0.7 }],
      latestResearchDate: "2026-05-01T00:00:00Z",
    };
    const fetchMock = mockFetch({ data: inner });
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const result = await getNicheRootsTool.handler({ nicheId: "z1" }, CTX);
    expect(getCallUrl(fetchMock)).toBe("https://api.datadive.tools/v1/niches/z1/roots");
    expect(result).toEqual(inner);
  });

  it("encodes the nicheId path segment", async () => {
    const fetchMock = mockFetch({ data: [] });
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    await getNicheRootsTool.handler({ nicheId: "a/b c" }, CTX);
    expect(getCallUrl(fetchMock)).toBe("https://api.datadive.tools/v1/niches/a%2Fb%20c/roots");
  });
});
