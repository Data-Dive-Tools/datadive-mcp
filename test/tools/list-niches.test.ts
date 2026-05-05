import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { listNichesTool } from "../../src/tools/list-niches.js";
import { CTX, mockFetch, getCallUrl } from "./_helpers.js";

describe("list_niches tool", () => {
  let originalFetch: typeof fetch;
  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });
  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("name + description sanity", () => {
    expect(listNichesTool.name).toBe("list_niches");
    expect(listNichesTool.description.length).toBeGreaterThan(80);
    expect(listNichesTool.description.toLowerCase()).toContain("niche");
  });

  it("calls /v1/niches with no query when no args provided", async () => {
    const fetchMock = mockFetch({
      data: [],
      currentPage: 1,
      pageSize: 20,
      total: 0,
      lastPage: 1,
      hasNext: false,
      hasPrev: false,
    });
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    await listNichesTool.handler({}, CTX);
    expect(getCallUrl(fetchMock)).toBe("https://api.datadive.tools/v1/niches");
  });

  it("forwards currentPage and pageSize as query params", async () => {
    const fetchMock = mockFetch({
      data: [],
      currentPage: 2,
      pageSize: 50,
      total: 0,
      lastPage: 1,
      hasNext: false,
      hasPrev: false,
    });
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    await listNichesTool.handler({ currentPage: 2, pageSize: 50 }, CTX);
    expect(getCallUrl(fetchMock)).toBe("https://api.datadive.tools/v1/niches?currentPage=2&pageSize=50");
  });

  it("returns the bare paginated body intact (does not unwrap)", async () => {
    const body = {
      data: [{ nicheId: "z1", heroKeyword: "dog hat", nicheLabel: "Hats", marketplace: "com", latestResearchDate: null }],
      currentPage: 1,
      pageSize: 20,
      total: 1,
      lastPage: 1,
      hasNext: false,
      hasPrev: false,
    };
    globalThis.fetch = mockFetch(body) as unknown as typeof fetch;

    const result = await listNichesTool.handler({}, CTX);
    expect(result).toEqual(body);
  });
});
