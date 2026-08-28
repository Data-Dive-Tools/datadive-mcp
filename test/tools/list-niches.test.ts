import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { z } from "zod";
import { LIST_NICHES_MAX_PAGE_SIZE, listNichesTool } from "../../src/tools/list-niches.js";
import { CTX, mockFetch, getCallUrl } from "./_helpers.js";

const EMPTY_PAGE = {
  data: [],
  currentPage: 1,
  pageSize: 20,
  total: 0,
  lastPage: 1,
  hasNext: false,
  hasPrev: false,
};

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

  it("warns that paging is not applied and that there is no search", () => {
    const description = listNichesTool.description.toLowerCase();
    expect(description).toContain("does not apply paging");
    expect(description).toContain("no server-side search");
  });

  it("calls /v1/niches with no query when no args provided", async () => {
    const fetchMock = mockFetch(EMPTY_PAGE);
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    await listNichesTool.handler({}, CTX);
    expect(getCallUrl(fetchMock)).toBe("https://api.datadive.tools/v1/niches");
  });

  it("forwards currentPage and pageSize as query params", async () => {
    const fetchMock = mockFetch({ ...EMPTY_PAGE, currentPage: 2, pageSize: 50 });
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    await listNichesTool.handler({ currentPage: 2, pageSize: 50 }, CTX);
    expect(getCallUrl(fetchMock)).toBe("https://api.datadive.tools/v1/niches?currentPage=2&pageSize=50");
  });

  it("never forwards the withdrawn search and ordering filters, even if a client sends them", async () => {
    const fetchMock = mockFetch(EMPTY_PAGE);
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    // The API binds only currentPage/pageSize and drops unknown query params silently, so
    // forwarding these would advertise filtering that never happens. Restore with the API fix.
    await listNichesTool.handler(
      { currentPage: 1, searchText: "dog hat", searchAsin: "B08N5WRWNW", orderBy: "name", sortOrder: "DESC" } as never,
      CTX,
    );

    const url = getCallUrl(fetchMock);
    expect(url).toBe("https://api.datadive.tools/v1/niches?currentPage=1");
    for (const param of ["searchText", "searchAsin", "orderBy", "sortOrder"]) {
      expect(url).not.toContain(param);
    }
  });

  describe("input schema", () => {
    const schema = z.object(listNichesTool.inputSchema);

    it("exposes only the two pagination inputs", () => {
      expect(Object.keys(listNichesTool.inputSchema).sort()).toEqual(["currentPage", "pageSize"]);
    });

    it("caps pageSize at the API maximum instead of over-asking", () => {
      expect(LIST_NICHES_MAX_PAGE_SIZE).toBe(50);
      expect(schema.safeParse({ pageSize: 50 }).success).toBe(true);
      expect(schema.safeParse({ pageSize: 51 }).success).toBe(false);
      expect(schema.safeParse({ pageSize: 100 }).success).toBe(false);
    });

    it("strips the withdrawn filters instead of keeping them", () => {
      const parsed = schema.parse({
        pageSize: 10,
        searchText: "hat",
        searchAsin: "B08N5WRWNW",
        orderBy: "lastDived",
        sortOrder: "ASC",
      });
      expect(parsed).toEqual({ pageSize: 10 });
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
