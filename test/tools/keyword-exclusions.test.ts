import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { listKeywordExclusionsTool } from "../../src/tools/list-keyword-exclusions.js";
import { addKeywordExclusionsTool } from "../../src/tools/add-keyword-exclusions.js";
import { removeKeywordExclusionsTool } from "../../src/tools/remove-keyword-exclusions.js";
import { CTX, mockFetch, getCallUrl, getCallInit } from "./_helpers.js";

const LISTS = {
  exact: [{ keyword: "dog hat", searchVolume: 12345 }],
  phrase: [{ phrase: "puppy", searchVolume: 19586, excludedKeywordsCount: 4 }],
};

describe("list_keyword_exclusions tool", () => {
  let originalFetch: typeof fetch;
  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });
  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("GETs /keyword-exclusions and returns the unwrapped lists", async () => {
    const fetchMock = mockFetch({ success: true, data: LISTS });
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const result = await listKeywordExclusionsTool.handler({ nicheId: "n/1" }, CTX);

    expect(getCallUrl(fetchMock)).toBe("https://api.datadive.tools/v1/niches/n%2F1/keyword-exclusions");
    expect(getCallInit(fetchMock).method).toBe("GET");
    expect(result).toEqual(LISTS);
  });

  it("is read-only", () => {
    expect(listKeywordExclusionsTool.annotations.readOnlyHint).toBe(true);
  });
});

describe.each([
  ["add_keyword_exclusions", addKeywordExclusionsTool, "/keyword-exclusions", "added"],
  ["remove_keyword_exclusions", removeKeywordExclusionsTool, "/keyword-exclusions/remove", "removed"],
] as const)("%s tool", (_name, tool, suffix, changedKey) => {
  let originalFetch: typeof fetch;
  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });
  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("POSTs both lists and returns the response as-is", async () => {
    const payload = {
      ...LISTS,
      [changedKey]: { exact: ["dog hat"], phrase: [] },
      unchanged: { exact: [], phrase: ["puppy"] },
    };
    const fetchMock = mockFetch({ success: true, data: payload });
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const result = await tool.handler({ nicheId: "n-1", exact: ["dog hat"], phrase: ["puppy"] }, CTX);

    expect(new URL(getCallUrl(fetchMock)).pathname).toBe(`/v1/niches/n-1${suffix}`);
    const init = getCallInit(fetchMock);
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body as string)).toEqual({ exact: ["dog hat"], phrase: ["puppy"] });
    expect(result).toEqual(payload);
  });

  it("leaves an omitted list out of the body", async () => {
    const fetchMock = mockFetch({ success: true, data: {} });
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    await tool.handler({ nicheId: "n-1", phrase: ["puppy"] }, CTX);

    expect(JSON.parse(getCallInit(fetchMock).body as string)).toEqual({ phrase: ["puppy"] });
  });

  it("refuses no entries and more than 100 in total before calling the API", async () => {
    const fetchMock = mockFetch({});
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    await expect(tool.handler({ nicheId: "n-1" }, CTX)).rejects.toThrow(/1 to 100 entries.*got 0/);
    await expect(tool.handler({ nicheId: "n-1", exact: [], phrase: [] }, CTX)).rejects.toThrow(/got 0/);
    const sixty = (p: string) => Array.from({ length: 60 }, (_, i) => `${p} ${i}`);
    await expect(tool.handler({ nicheId: "n-1", exact: sixty("e"), phrase: sixty("p") }, CTX)).rejects.toThrow(
      /got 120/,
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("accepts exactly 100 entries split across both lists", async () => {
    const fetchMock = mockFetch({ success: true, data: {} });
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    const fifty = (p: string) => Array.from({ length: 50 }, (_, i) => `${p} ${i}`);

    await tool.handler({ nicheId: "n-1", exact: fifty("e"), phrase: fifty("p") }, CTX);

    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it("normalises entries and refuses duplicates within a list at the schema level", () => {
    const { exact, phrase } = tool.inputSchema;
    expect(exact.parse([" Dog Hat "])).toEqual(["dog hat"]);
    expect(() => exact.parse(["Dog Hat", "dog hat"])).toThrow(/same keyword twice/);
    expect(() => phrase.parse(["  "])).toThrow();
    expect(() => phrase.parse(["x".repeat(256)])).toThrow();
    expect(() => exact.parse(Array.from({ length: 101 }, (_, i) => `kw ${i}`))).toThrow();
    expect(exact.parse(undefined)).toBeUndefined();
  });

  it("maps a 403 for another org's niche to a forbidden error", async () => {
    globalThis.fetch = mockFetch({ statusCode: 403, message: "Forbidden resource" }, 403) as unknown as typeof fetch;

    await expect(tool.handler({ nicheId: "n-1", exact: ["dog hat"] }, CTX)).rejects.toThrow(/^Forbidden:/);
  });

  it("has no confirm gate", () => {
    expect("confirm" in tool.inputSchema).toBe(false);
  });
});
