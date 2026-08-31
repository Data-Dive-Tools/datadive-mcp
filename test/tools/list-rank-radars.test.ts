import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  listRankRadarsTool,
  LIST_RANK_RADARS_MAX_PAGE_SIZE,
} from "../../src/tools/list-rank-radars.js";
import type { RankRadarList } from "../../src/types/api.js";
import { CTX, mockFetch, getCallUrl } from "./_helpers.js";

/** `ToolDefinition.handler` is declared as `Promise<unknown>`; the tool's own return type is this. */
const call = (args: Parameters<typeof listRankRadarsTool.handler>[0]) =>
  listRankRadarsTool.handler(args, CTX) as Promise<RankRadarList>;

/** A row shaped exactly as the API sends it, including the `krt_asin` internals. */
const apiRow = {
  id: "rr-1",
  status: "ACTIVE",
  asin: {
    id: "krt-asin-uuid",
    krtId: "rr-1",
    asin: "B0001",
    parent_asin: "B0PARENT",
    image_url: "https://img/1.jpg",
    variation_attributes: { size: "L" },
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-02T00:00:00.000Z",
    deleted_at: null,
  },
  marketplace: "com",
  keywordCount: 100,
  title: "X",
  imageUrl: "",
  top10KW: 5,
  top10SV: 1000,
  top50KW: 10,
  top50SV: 5000,
};

const pageOf = (rows: unknown[]) => ({
  data: rows,
  currentPage: 1,
  pageSize: 20,
  total: rows.length,
  lastPage: 1,
  hasNext: false,
  hasPrev: false,
});

describe("list_rank_radars tool", () => {
  let originalFetch: typeof fetch;
  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });
  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("sends only provided query params; skips undefined", async () => {
    const fetchMock = mockFetch({ data: pageOf([]) });
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    await listRankRadarsTool.handler({ status: "ACTIVE", nicheId: "z1" }, CTX);
    const url = new URL(getCallUrl(fetchMock));
    expect(url.pathname).toBe("/v1/niches/rank-radars");
    expect(url.searchParams.get("status")).toBe("ACTIVE");
    expect(url.searchParams.get("nicheId")).toBe("z1");
    expect(url.searchParams.has("currentPage")).toBe(false);
    expect(url.searchParams.has("searchText")).toBe(false);
  });

  it("unwraps the outer envelope, preserves inner pagination", async () => {
    globalThis.fetch = mockFetch({ data: pageOf([apiRow]) }) as unknown as typeof fetch;

    const result = await call({});

    expect(result).toMatchObject({ currentPage: 1, pageSize: 20, total: 1, lastPage: 1, hasNext: false });
    expect(result.data).toHaveLength(1);
  });

  it("flattens asin and drops every internal krt_asin field", async () => {
    globalThis.fetch = mockFetch({ data: pageOf([apiRow]) }) as unknown as typeof fetch;

    const item = (await call({})).data[0]!;

    expect(item.asin).toBe("B0001");
    expect(Object.keys(item).sort()).toEqual([
      "asin",
      "id",
      "imageUrl",
      "keywordCount",
      "marketplace",
      "status",
      "title",
      "top10KW",
      "top10SV",
      "top50KW",
      "top50SV",
    ]);
    // None of the identifiers or logging timestamps survive anywhere in the payload.
    const serialized = JSON.stringify(item);
    for (const leaked of ["krt-asin-uuid", "krtId", "parent_asin", "image_url", "variation_attributes", "created_at", "updated_at", "deleted_at"]) {
      expect(serialized).not.toContain(leaked);
    }
  });

  it("keeps the status the API reports, which the filter also accepts", async () => {
    globalThis.fetch = mockFetch({
      data: pageOf([{ ...apiRow, status: "ARCHIVED" }]),
    }) as unknown as typeof fetch;

    const item = (await call({ status: "ARCHIVED" })).data[0]!;

    expect(item.status).toBe("ARCHIVED");
    expect(listRankRadarsTool.inputSchema.status.parse(item.status)).toBe("ARCHIVED");
  });

  it("tolerates a page the API sends without a data array", async () => {
    globalThis.fetch = mockFetch({
      data: { currentPage: 1, pageSize: 20, total: 0, lastPage: 1, hasNext: false, hasPrev: false },
    }) as unknown as typeof fetch;

    expect((await call({})).data).toEqual([]);
  });

  it("accepts only the status values the API honors", () => {
    const schema = listRankRadarsTool.inputSchema;
    for (const value of ["ACTIVE", "PAUSED", "ARCHIVED", "ALL"]) {
      expect(schema.status.parse(value)).toBe(value);
    }
    expect(() => schema.status.parse("BANANA")).toThrow();
    expect(() => schema.status.parse("normal")).toThrow();
  });

  it("caps pageSize at the API's maximum", () => {
    const schema = listRankRadarsTool.inputSchema;
    expect(LIST_RANK_RADARS_MAX_PAGE_SIZE).toBe(50);
    expect(schema.pageSize.parse(LIST_RANK_RADARS_MAX_PAGE_SIZE)).toBe(LIST_RANK_RADARS_MAX_PAGE_SIZE);
    expect(() => schema.pageSize.parse(LIST_RANK_RADARS_MAX_PAGE_SIZE + 1)).toThrow();
    expect(() => schema.pageSize.parse(100)).toThrow();
  });
});
