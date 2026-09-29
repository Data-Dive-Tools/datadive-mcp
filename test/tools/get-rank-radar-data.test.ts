import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { z } from "zod";
import { getRankRadarDataTool } from "../../src/tools/get-rank-radar-data.js";
import { CTX, mockFetch, getCallUrl } from "./_helpers.js";

describe("get_rank_radar_data tool", () => {
  let originalFetch: typeof fetch;
  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });
  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  const validUuid = "11111111-1111-4111-8111-111111111111";

  /** API stub serving `total` keywords in pages, honouring `currentPage` / `pageSize` like the backend. */
  function pagedFetch(total: number) {
    return vi.fn(async (input: string) => {
      const q = new URL(input).searchParams;
      const currentPage = Number(q.get("currentPage") ?? 1);
      const pageSize = Number(q.get("pageSize") ?? 20);
      const lastPage = Math.max(1, Math.ceil(total / pageSize));
      const first = (currentPage - 1) * pageSize;
      const data = Array.from({ length: Math.max(0, Math.min(pageSize, total - first)) }, (_, i) => ({
        id: `kw-${first + i}`,
        keyword: `keyword ${first + i}`,
        searchVolume: 100,
        ranks: [],
        highlights: [],
      }));
      const page = {
        data,
        currentPage,
        pageSize,
        total,
        lastPage,
        hasNext: currentPage < lastPage,
        hasPrev: currentPage > 1,
      };
      return new Response(JSON.stringify({ success: true, data: page }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    });
  }

  const PAGE = {
    data: [
      {
        id: "22222222-2222-4222-8222-222222222222",
        keyword: "protein powder",
        searchVolume: 1000,
        relevancy: 0.5,
        ranks: [{ date: "2024-03-26", organicRank: 4, sponsoredRank: 1, impressionRank: null }],
        adData: null,
        sqpData: null,
        highlights: [],
      },
    ],
    currentPage: 1,
    pageSize: 20,
    total: 21,
    lastPage: 2,
    hasNext: true,
    hasPrev: false,
  };

  it("calls the rankRadarId path with startDate/endDate query", async () => {
    const fetchMock = mockFetch({ success: true, data: PAGE });
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    await getRankRadarDataTool.handler(
      { rankRadarId: validUuid, startDate: "2024-03-26", endDate: "2024-04-26" },
      CTX,
    );
    const url = new URL(getCallUrl(fetchMock));
    expect(url.pathname).toBe(`/v1/niches/rank-radars/${validUuid}`);
    expect(url.searchParams.get("startDate")).toBe("2024-03-26");
    expect(url.searchParams.get("endDate")).toBe("2024-04-26");
  });

  it("forwards currentPage and pageSize when given, as one call for one page", async () => {
    const fetchMock = mockFetch({ success: true, data: PAGE });
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const result = await getRankRadarDataTool.handler(
      {
        rankRadarId: validUuid,
        startDate: "2024-03-26",
        endDate: "2024-04-26",
        currentPage: 3,
        pageSize: 100,
      },
      CTX,
    );
    const paged = new URL(getCallUrl(fetchMock));
    expect(paged.searchParams.get("currentPage")).toBe("3");
    expect(paged.searchParams.get("pageSize")).toBe("100");
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(result).toEqual(PAGE);
  });

  it("treats pageSize alone as a request for one page", async () => {
    const fetchMock = mockFetch({ success: true, data: PAGE });
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    await getRankRadarDataTool.handler(
      { rankRadarId: validUuid, startDate: "2024-03-26", endDate: "2024-04-26", pageSize: 50 },
      CTX,
    );
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(new URL(getCallUrl(fetchMock)).searchParams.has("currentPage")).toBe(false);
  });

  // RS-11791: a client holding the tool list from before paging only knows the three original
  // inputs. It must still get every keyword, as it did before the API started paging.
  it("without page inputs reads every page at pageSize 100 and returns them as one result", async () => {
    const fetchMock = pagedFetch(250);
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const result = await getRankRadarDataTool.handler(
      { rankRadarId: validUuid, startDate: "2024-03-26", endDate: "2024-04-26" },
      CTX,
    );

    expect(fetchMock).toHaveBeenCalledTimes(3);
    const pages = fetchMock.mock.calls.map((call) => new URL((call as unknown as [string])[0]).searchParams);
    expect(pages.map((q) => q.get("currentPage"))).toEqual(["1", "2", "3"]);
    expect(pages.every((q) => q.get("pageSize") === "100")).toBe(true);
    expect(pages.every((q) => q.get("startDate") === "2024-03-26" && q.get("endDate") === "2024-04-26")).toBe(
      true,
    );
    expect(result).toMatchObject({
      total: 250,
      pageSize: 250,
      currentPage: 1,
      lastPage: 1,
      hasNext: false,
      hasPrev: false,
    });
    const ids = (result as { data: Array<{ id: string }> }).data.map((k) => k.id);
    expect(ids).toHaveLength(250);
    expect(new Set(ids).size).toBe(250);
  });

  it("without page inputs costs one call when the Rank Radar fits one page", async () => {
    const fetchMock = pagedFetch(50);
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const result = await getRankRadarDataTool.handler(
      { rankRadarId: validUuid, startDate: "2024-03-26", endDate: "2024-04-26" },
      CTX,
    );
    expect(fetchMock).toHaveBeenCalledOnce();
    expect((result as { data: unknown[] }).data).toHaveLength(50);
  });

  it("stops at lastPage even if the API keeps claiming hasNext", async () => {
    const fetchMock = mockFetch({ success: true, data: { ...PAGE, hasNext: true, lastPage: 3 } });
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    await getRankRadarDataTool.handler(
      { rankRadarId: validUuid, startDate: "2024-03-26", endDate: "2024-04-26" },
      CTX,
    );
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("caps pageSize at the API's maximum, which would otherwise fall back to 20 silently", () => {
    const schema = z.object(getRankRadarDataTool.inputSchema);
    const base = { rankRadarId: validUuid, startDate: "2024-03-26", endDate: "2024-04-26" };
    expect(() => schema.parse({ ...base, pageSize: 100 })).not.toThrow();
    expect(() => schema.parse({ ...base, pageSize: 101 })).toThrow();
    expect(() => schema.parse({ ...base, pageSize: 0 })).toThrow();
    expect(() => schema.parse({ ...base, currentPage: 0 })).toThrow();
  });

  it("rejects malformed dates at the schema level", () => {
    const schema = z.object(getRankRadarDataTool.inputSchema);
    expect(() =>
      schema.parse({ rankRadarId: validUuid, startDate: "2024-3-26", endDate: "2024-04-26" }),
    ).toThrow();
    expect(() =>
      schema.parse({ rankRadarId: validUuid, startDate: "march 26", endDate: "2024-04-26" }),
    ).toThrow();
  });

  it("rejects non-UUID rankRadarId", () => {
    const schema = z.object(getRankRadarDataTool.inputSchema);
    expect(() =>
      schema.parse({ rankRadarId: "abc", startDate: "2024-03-26", endDate: "2024-04-26" }),
    ).toThrow();
  });
});
