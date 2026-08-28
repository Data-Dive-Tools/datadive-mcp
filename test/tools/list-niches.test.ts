import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { z } from "zod";
import { LIST_NICHES_MAX_PAGE_SIZE, listNichesTool } from "../../src/tools/list-niches.js";
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

  it("no longer carries the temporary paging warning", () => {
    const description = listNichesTool.description.toLowerCase();
    expect(description).not.toContain("does not apply paging");
    expect(description).not.toContain("no server-side search");
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

  it("forwards the search and ordering filters as query params", async () => {
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

    await listNichesTool.handler(
      { searchText: "dog hat", searchAsin: "B08N5WRWNW", orderBy: "name", sortOrder: "DESC" },
      CTX,
    );
    expect(getCallUrl(fetchMock)).toBe(
      "https://api.datadive.tools/v1/niches?searchText=dog+hat&searchAsin=B08N5WRWNW&orderBy=name&sortOrder=DESC",
    );
  });

  describe("input schema", () => {
    const schema = z.object(listNichesTool.inputSchema);

    it("caps pageSize at the API maximum instead of over-asking", () => {
      expect(LIST_NICHES_MAX_PAGE_SIZE).toBe(50);
      expect(schema.safeParse({ pageSize: 50 }).success).toBe(true);
      expect(schema.safeParse({ pageSize: 51 }).success).toBe(false);
      expect(schema.safeParse({ pageSize: 100 }).success).toBe(false);
    });

    it("accepts the documented filters and rejects the rest", () => {
      expect(schema.safeParse({ searchText: "hat", searchAsin: "b08n5wrwnw", orderBy: "lastDived", sortOrder: "ASC" }).success).toBe(true);
      expect(schema.safeParse({ searchAsin: "B08" }).success).toBe(false);
      expect(schema.safeParse({ orderBy: "heroKeyword" }).success).toBe(false);
      expect(schema.safeParse({ sortOrder: "sideways" }).success).toBe(false);
    });
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
