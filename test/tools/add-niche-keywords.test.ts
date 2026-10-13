import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { addNicheKeywordsTool } from "../../src/tools/add-niche-keywords.js";
import { CTX, CTX_AUTO_CONFIRM, mockFetch, getCallUrl, getCallInit } from "./_helpers.js";

const FREE_ADD = {
  originBreakdown: {
    alreadyInMkl: ["dog hat"],
    takenFromOutliers: ["dog beanie"],
    takenFromResidue: [],
    addedManually: ["knit dog hat"],
  },
  tokensUsed: 0,
};

const MAX_TOKENS_EXCEEDED = {
  statusCode: 400,
  error: "MAX_TOKENS_EXCEEDED",
  message:
    "Adding these keywords re-dives the Niche for up to 12 Dive tokens, more than maxTokensUsed (0). Nothing was saved or charged.",
  success: false,
  maxTokensUsed: 0,
  tokensUsed: 12,
};

function body(fetchMock: ReturnType<typeof mockFetch>) {
  return JSON.parse(getCallInit(fetchMock).body as string);
}

describe("add_niche_keywords tool", () => {
  let originalFetch: typeof fetch;
  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });
  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("adds to a fresh niche in one call, capped at 0 tokens, and returns the unwrapped result", async () => {
    const fetchMock = mockFetch({ success: true, data: FREE_ADD });
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const result = await addNicheKeywordsTool.handler(
      { nicheId: "n-1", keywords: ["dog hat", "dog beanie", "knit dog hat"] },
      CTX,
    );

    expect(fetchMock).toHaveBeenCalledOnce();
    expect(new URL(getCallUrl(fetchMock)).pathname).toBe("/v1/niches/n-1/keywords");
    expect(getCallInit(fetchMock).method).toBe("POST");
    // No dryRun: the 0-token cap is what keeps an unconfirmed call from spending.
    expect(body(fetchMock)).toEqual({ keywords: ["dog hat", "dog beanie", "knit dog hat"], maxTokensUsed: 0 });
    expect(result).toEqual(FREE_ADD);
  });

  it("returns confirmation_required with the API's cost when a stale niche would re-dive", async () => {
    const fetchMock = mockFetch(MAX_TOKENS_EXCEEDED, 400);
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const result = (await addNicheKeywordsTool.handler({ nicheId: "n-1", keywords: ["knit dog hat"] }, CTX)) as {
      status: string;
      tokenCost: number;
      costNote: string;
    };

    expect(fetchMock).toHaveBeenCalledOnce();
    expect(result.status).toBe("confirmation_required");
    expect(result.tokenCost).toBe(12);
    expect(result.costNote).toContain("up to 12 Dive tokens");
    expect(result.costNote).toContain("24 hours");
  });

  it("never lets an unconfirmed call lift the 0-token cap", async () => {
    const fetchMock = mockFetch({ success: true, data: FREE_ADD });
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    await addNicheKeywordsTool.handler({ nicheId: "n-1", keywords: ["dog hat"], maxTokensUsed: 50 }, CTX);

    expect(body(fetchMock).maxTokensUsed).toBe(0);
  });

  it("passes other 400s through as errors instead of a confirmation", async () => {
    const fetchMock = mockFetch({ statusCode: 400, message: "This niche has 1 competitor(s); at least 2 are required" }, 400);
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    await expect(addNicheKeywordsTool.handler({ nicheId: "n-1", keywords: ["dog hat"] }, CTX)).rejects.toThrow(
      /at least 2 are required/,
    );
  });

  it("with confirm: true makes the real call with the approved cap and returns the refresh", async () => {
    const paid = {
      ...FREE_ADD,
      tokensUsed: 11,
      refresh: { diveId: "d-1", estimatedCompletionDate: "2026-10-12T10:00:00.000Z" },
    };
    const fetchMock = mockFetch({ success: true, data: paid });
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const result = await addNicheKeywordsTool.handler(
      { nicheId: "n-1", keywords: ["knit dog hat"], confirm: true, maxTokensUsed: 12 },
      CTX,
    );

    expect(fetchMock).toHaveBeenCalledOnce();
    expect(body(fetchMock)).toEqual({ keywords: ["knit dog hat"], maxTokensUsed: 12 });
    expect(result).toEqual(paid);
  });

  it("with confirm: true and no cap sends no maxTokensUsed", async () => {
    const fetchMock = mockFetch({ success: true, data: FREE_ADD });
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    await addNicheKeywordsTool.handler({ nicheId: "n-1", keywords: ["dog hat"], confirm: true }, CTX);

    expect(body(fetchMock)).toEqual({ keywords: ["dog hat"] });
  });

  it("surfaces MAX_TOKENS_EXCEEDED on a confirmed call as an error, not a fresh confirmation", async () => {
    const fetchMock = mockFetch({ ...MAX_TOKENS_EXCEEDED, maxTokensUsed: 10 }, 400);
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    await expect(
      addNicheKeywordsTool.handler(
        { nicheId: "n-1", keywords: ["knit dog hat"], confirm: true, maxTokensUsed: 10 },
        CTX,
      ),
    ).rejects.toThrow(/Nothing was saved or charged/);
  });

  it("skips the gate when autoConfirmWrites is set", async () => {
    const fetchMock = mockFetch({ success: true, data: FREE_ADD });
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    await addNicheKeywordsTool.handler({ nicheId: "n-1", keywords: ["dog hat"] }, CTX_AUTO_CONFIRM);

    expect(body(fetchMock)).toEqual({ keywords: ["dog hat"] });
  });

  it("encodes the nicheId into the path", async () => {
    const fetchMock = mockFetch({ success: true, data: FREE_ADD });
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    await addNicheKeywordsTool.handler({ nicheId: "n/1 2", keywords: ["dog hat"] }, CTX);

    expect(getCallUrl(fetchMock)).toContain("/v1/niches/n%2F1%202/keywords");
  });

  it("normalises keywords the way the API does and refuses duplicates and bad sizes at the schema level", () => {
    const { keywords } = addNicheKeywordsTool.inputSchema;
    expect(keywords.parse(["  Dog Hat "])).toEqual(["dog hat"]);
    expect(() => keywords.parse(["Dog Hat", "dog hat "])).toThrow(/same keyword twice/);
    expect(() => keywords.parse([])).toThrow();
    expect(() => keywords.parse(["   "])).toThrow();
    expect(() => keywords.parse(["x".repeat(256)])).toThrow();
    expect(keywords.parse(["x".repeat(255)])).toHaveLength(1);
    expect(keywords.parse(Array.from({ length: 100 }, (_, i) => `kw ${i}`))).toHaveLength(100);
    expect(() => keywords.parse(Array.from({ length: 101 }, (_, i) => `kw ${i}`))).toThrow();
  });

  it("is flagged as a non-read-only, destructive tool", () => {
    expect(addNicheKeywordsTool.annotations.readOnlyHint).toBe(false);
    expect(addNicheKeywordsTool.annotations.destructiveHint).toBe(true);
  });
});
