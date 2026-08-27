import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { deleteRankRadarTool } from "../../src/tools/delete-rank-radar.js";
import { CTX, CTX_AUTO_CONFIRM, mockNoContentFetch, getCallUrl, getCallInit } from "./_helpers.js";

const RR_ID = "3f4a1c2e-5b6d-4e7f-8a9b-0c1d2e3f4a5b";

describe("delete_rank_radar tool", () => {
  let originalFetch: typeof fetch;
  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });
  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("DELETEs /v1/niches/rank-radars/:rankRadarId when confirmed", async () => {
    const fetchMock = mockNoContentFetch();
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const result = await deleteRankRadarTool.handler({ rankRadarId: RR_ID, confirm: true }, CTX);

    expect(new URL(getCallUrl(fetchMock)).pathname).toBe(`/v1/niches/rank-radars/${RR_ID}`);
    expect(getCallInit(fetchMock).method).toBe("DELETE");
    expect(result).toEqual({ status: "deleted", rankRadarId: RR_ID });
  });

  it("returns confirmation_required and does NOT call the API without confirm", async () => {
    const fetchMock = mockNoContentFetch();
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const result = await deleteRankRadarTool.handler({ rankRadarId: RR_ID }, CTX);

    expect(result).toMatchObject({ status: "confirmation_required" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("proceeds without confirm when autoConfirmWrites is set", async () => {
    const fetchMock = mockNoContentFetch();
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    await deleteRankRadarTool.handler({ rankRadarId: RR_ID }, CTX_AUTO_CONFIRM);

    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it("rejects a non-UUID rankRadarId at the schema level", () => {
    expect(() => deleteRankRadarTool.inputSchema.rankRadarId.parse("not-a-uuid")).toThrow();
    expect(deleteRankRadarTool.inputSchema.rankRadarId.parse(RR_ID)).toBe(RR_ID);
  });
});
