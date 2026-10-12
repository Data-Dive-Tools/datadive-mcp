import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { removeNicheKeywordsTool } from "../../src/tools/remove-niche-keywords.js";
import { CTX, mockFetch, getCallUrl, getCallInit } from "./_helpers.js";

describe("remove_niche_keywords tool", () => {
  let originalFetch: typeof fetch;
  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });
  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("POSTs the keywords to /keywords/remove and returns the breakdown as-is", async () => {
    const payload = {
      removedManual: ["knit dog hat"],
      sentBackToOutliers: ["dog beanie"],
      sentBackToResidue: [],
      notRemovable: ["dog hat"],
    };
    const fetchMock = mockFetch({ success: true, data: payload });
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const result = await removeNicheKeywordsTool.handler(
      { nicheId: "n-1", keywords: ["knit dog hat", "dog beanie", "dog hat"] },
      CTX,
    );

    expect(new URL(getCallUrl(fetchMock)).pathname).toBe("/v1/niches/n-1/keywords/remove");
    const init = getCallInit(fetchMock);
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body as string)).toEqual({ keywords: ["knit dog hat", "dog beanie", "dog hat"] });
    expect(result).toEqual(payload);
  });

  it("has no confirm gate", () => {
    expect("confirm" in removeNicheKeywordsTool.inputSchema).toBe(false);
  });

  it("maps a 404 for an undived niche to a not-found error", async () => {
    globalThis.fetch = mockFetch(
      { statusCode: 404, message: "Niche not found, or it has no completed research" },
      404,
    ) as unknown as typeof fetch;

    await expect(removeNicheKeywordsTool.handler({ nicheId: "n-1", keywords: ["dog hat"] }, CTX)).rejects.toThrow(
      /Not found: Niche not found, or it has no completed research/,
    );
  });

  it("shares the add tool's keyword rules", () => {
    const { keywords } = removeNicheKeywordsTool.inputSchema;
    expect(keywords.parse([" Dog Hat"])).toEqual(["dog hat"]);
    expect(() => keywords.parse(["dog hat", "DOG HAT"])).toThrow(/same keyword twice/);
    expect(() => keywords.parse([])).toThrow();
  });
});
