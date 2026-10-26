import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { listFastKeywordsTool } from "../../src/tools/list-fast-keywords.js";
import { getFastKeywordsTool } from "../../src/tools/get-fast-keywords.js";
import { getFastKeywordsKeywordsTool } from "../../src/tools/get-fast-keywords-keywords.js";
import { runFastKeywordsTool } from "../../src/tools/run-fast-keywords.js";
import { refreshFastKeywordsTool } from "../../src/tools/refresh-fast-keywords.js";
import { CTX, CTX_AUTO_CONFIRM, mockFetch, getCallUrl, getCallInit } from "./_helpers.js";

const bodyOf = (fetchMock: ReturnType<typeof vi.fn>, call = 0) =>
  JSON.parse(((fetchMock.mock.calls[call] as unknown as [string, RequestInit])[1].body ?? "null") as string);

const RUN = {
  fastKeywordsId: 8052,
  requestId: 12011,
  status: "in-progress",
  tokenCost: 1,
  estimatedCompletionDate: "2026-10-22T10:05:00.000Z",
};
const PREVIEW = { tokenCost: 1, hasEnoughTokens: true };
const page = { currentPage: 1, pageSize: 20, total: 0, lastPage: 1, hasNext: false, hasPrev: false };

describe("fast keywords tools", () => {
  let originalFetch: typeof fetch;
  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });
  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  describe("read tools", () => {
    it("list_fast_keywords forwards its filters and returns the page intact", async () => {
      const body = { data: [{ fastKeywordsId: 1 }], ...page };
      const fetchMock = mockFetch(body);
      globalThis.fetch = fetchMock as unknown as typeof fetch;

      const result = await listFastKeywordsTool.handler(
        { currentPage: 2, pageSize: 50, search: "dog hat", marketplace: "co.uk" },
        CTX,
      );

      expect(getCallUrl(fetchMock)).toBe(
        "https://api.datadive.tools/v1/fast-keywords?currentPage=2&pageSize=50&search=dog+hat&marketplace=co.uk",
      );
      expect(result).toEqual(body);
      expect(listFastKeywordsTool.annotations.readOnlyHint).toBe(true);
    });

    it("get_fast_keywords GETs the result by id and unwraps it", async () => {
      const result = { fastKeywordsId: 8052, status: "success", roots: [], competitors: [] };
      const fetchMock = mockFetch({ data: result });
      globalThis.fetch = fetchMock as unknown as typeof fetch;

      expect(await getFastKeywordsTool.handler({ fastKeywordsId: 8052 }, CTX)).toEqual(result);
      expect(new URL(getCallUrl(fetchMock)).pathname).toBe("/v1/fast-keywords/8052");
      expect(getFastKeywordsTool.description).toMatch(/poll/i);
    });

    it("get_fast_keywords_keywords pages through the keyword rows", async () => {
      const fetchMock = mockFetch({ data: [], ...page });
      globalThis.fetch = fetchMock as unknown as typeof fetch;

      await getFastKeywordsKeywordsTool.handler({ fastKeywordsId: 8052, currentPage: 2, pageSize: 100 }, CTX);

      expect(getCallUrl(fetchMock)).toBe(
        "https://api.datadive.tools/v1/fast-keywords/8052/keywords?currentPage=2&pageSize=100",
      );
      expect(() => getFastKeywordsKeywordsTool.inputSchema.pageSize.parse(101)).toThrow();
    });
  });

  describe.each([
    {
      name: "run_fast_keywords",
      tool: runFastKeywordsTool,
      args: { marketplace: "com", asin: "B08N5WRWNW" },
      path: "/v1/fast-keywords",
      body: { marketplace: "com", asin: "B08N5WRWNW" },
    },
    {
      name: "refresh_fast_keywords",
      tool: refreshFastKeywordsTool,
      args: { fastKeywordsId: 8052 },
      path: "/v1/fast-keywords/8052/refresh",
      body: {},
    },
  ] as const)("$name", ({ name, tool, args, path, body }) => {
    const run = (extra: Record<string, unknown> = {}, ctx = CTX) =>
      (tool.handler as (a: Record<string, unknown>, c: typeof CTX) => Promise<unknown>)({ ...args, ...extra }, ctx);

    it("previews with a dry run on the first call and spends nothing", async () => {
      const fetchMock = mockFetch({ data: PREVIEW });
      globalThis.fetch = fetchMock as unknown as typeof fetch;

      const result = await run();

      expect(fetchMock).toHaveBeenCalledOnce();
      expect(new URL(getCallUrl(fetchMock)).pathname).toBe(path);
      expect(bodyOf(fetchMock)).toEqual({ ...body, dryRun: true });
      expect(result).toMatchObject({
        status: "confirmation_required",
        tokenCost: 1,
        hasEnoughTokens: true,
        costNote: expect.stringContaining("1 Dive token"),
      });
    });

    it("says so when the organization lacks Dive tokens", async () => {
      globalThis.fetch = mockFetch({ data: { tokenCost: 1, hasEnoughTokens: false } }) as unknown as typeof fetch;

      const result = (await run()) as { costNote: string; hasEnoughTokens: boolean };

      expect(result.hasEnoughTokens).toBe(false);
      expect(result.costNote).toMatch(/not have enough Dive tokens/);
    });

    it("runs for real with confirm and never sends dryRun", async () => {
      const fetchMock = mockFetch({ data: RUN });
      globalThis.fetch = fetchMock as unknown as typeof fetch;

      expect(await run({ confirm: true })).toEqual(RUN);
      expect(getCallInit(fetchMock).method).toBe("POST");
      expect(bodyOf(fetchMock)).toEqual(body);
      expect(bodyOf(fetchMock)).not.toHaveProperty("dryRun");
    });

    it("runs at once when the gate is opted out", async () => {
      const fetchMock = mockFetch({ data: RUN });
      globalThis.fetch = fetchMock as unknown as typeof fetch;

      await run({}, CTX_AUTO_CONFIRM);

      expect(fetchMock).toHaveBeenCalledOnce();
      expect(bodyOf(fetchMock)).not.toHaveProperty("dryRun");
    });

    it("reports a run that already happened when the backend ignored dryRun", async () => {
      globalThis.fetch = mockFetch({ data: RUN }) as unknown as typeof fetch;

      expect(await run()).toEqual(RUN);
    });

    it("keeps dryRun out of the input schema and is not safe to retry", () => {
      expect("dryRun" in tool.inputSchema).toBe(false);
      expect(tool.annotations).toMatchObject({ readOnlyHint: false, destructiveHint: true, openWorldHint: false });
      expect(tool.description).toMatch(/not safe to retry/i);
      expect(tool.name).toBe(name);
    });
  });

  describe("refresh_fast_keywords conflicts", () => {
    it("turns a COOLDOWN 409 into a message with the next eligible time", async () => {
      globalThis.fetch = mockFetch(
        {
          statusCode: 409,
          error: "COOLDOWN",
          message: "This Solo Reverse ASIN can only be updated once every 24 hours.",
          success: false,
          nextEligibleAt: "2026-10-23T09:00:00.000Z",
        },
        409,
      ) as unknown as typeof fetch;

      await expect(refreshFastKeywordsTool.handler({ fastKeywordsId: 8052 }, CTX)).rejects.toThrow(
        /can be refreshed again from 2026-10-23T09:00:00.000Z.*Nothing was run or charged/,
      );
    });

    it("turns an IN_PROGRESS 409 into a poll instruction", async () => {
      globalThis.fetch = mockFetch(
        { statusCode: 409, error: "IN_PROGRESS", message: "in progress", success: false, nextEligibleAt: null },
        409,
      ) as unknown as typeof fetch;

      await expect(refreshFastKeywordsTool.handler({ fastKeywordsId: 8052, confirm: true }, CTX)).rejects.toThrow(
        /already in progress.*poll `get_fast_keywords`/,
      );
    });

    it("leaves other 409s as they came", async () => {
      globalThis.fetch = mockFetch({ statusCode: 409, message: "Something else" }, 409) as unknown as typeof fetch;

      await expect(refreshFastKeywordsTool.handler({ fastKeywordsId: 8052, confirm: true }, CTX)).rejects.toThrow(
        /Something else/,
      );
    });
  });
});
