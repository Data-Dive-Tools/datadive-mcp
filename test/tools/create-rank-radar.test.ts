import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createRankRadarTool } from "../../src/tools/create-rank-radar.js";
import { CTX, CTX_AUTO_CONFIRM, mockFetch, getCallUrl, getCallInit } from "./_helpers.js";

describe("create_rank_radar tool", () => {
  let originalFetch: typeof fetch;
  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });
  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("POSTs to /v1/niches/rank-radars with the JSON body when confirmed", async () => {
    const fetchMock = mockFetch({ rankRadarId: "rr-1" });
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const result = await createRankRadarTool.handler(
      { asin: "B08N5WRWNW", numberOfKeywords: 5, nicheId: "z515cGOFg3", confirm: true },
      CTX,
    );

    const url = new URL(getCallUrl(fetchMock));
    expect(url.pathname).toBe("/v1/niches/rank-radars");
    const init = getCallInit(fetchMock);
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body as string)).toEqual({
      asin: "B08N5WRWNW",
      numberOfKeywords: 5,
      nicheId: "z515cGOFg3",
    });
    expect(result).toEqual({ rankRadarId: "rr-1" });
  });

  it("returns confirmation_required and does NOT call the API without confirm", async () => {
    const fetchMock = mockFetch({});
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const result = await createRankRadarTool.handler(
      { asin: "B08N5WRWNW", numberOfKeywords: 5, nicheId: "z515cGOFg3" },
      CTX,
    );

    expect(result).toMatchObject({ status: "confirmation_required" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("proceeds without confirm when autoConfirmWrites is set", async () => {
    const fetchMock = mockFetch({ rankRadarId: "rr-2" });
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    await createRankRadarTool.handler(
      { asin: "B08N5WRWNW", numberOfKeywords: 1, nicheId: "z515cGOFg3" },
      CTX_AUTO_CONFIRM,
    );

    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it("rejects numberOfKeywords < 1 at the schema level", () => {
    const schema = createRankRadarTool.inputSchema;
    expect(() => schema.numberOfKeywords.parse(0)).toThrow();
    expect(schema.numberOfKeywords.parse(1)).toBe(1);
  });
});
