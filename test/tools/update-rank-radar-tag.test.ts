import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { updateRankRadarTagTool } from "../../src/tools/update-rank-radar-tag.js";
import { CTX, mockFetch, getCallUrl, getCallInit } from "./_helpers.js";

const RR_ID = "3f4a1c2e-5b6d-4e7f-8a9b-0c1d2e3f4a5b";
const TAG_ID = "aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa";

const TAG = {
  id: TAG_ID,
  title: "Promo week v2",
  color: "#C9CFD7",
  description: null,
  startAt: null,
  endAt: null,
  keywordCount: 3,
  createdAt: "2026-10-10T00:00:00.000Z",
};

describe("update_rank_radar_tag tool", () => {
  let originalFetch: typeof fetch;
  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });
  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("PATCHes /v1/niches/rank-radars/:rankRadarId/tags/:tagId with the fields passed", async () => {
    const fetchMock = mockFetch({ data: TAG });
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const result = await updateRankRadarTagTool.handler(
      { rankRadarId: RR_ID, tagId: TAG_ID, title: "Promo week v2" },
      CTX,
    );

    expect(new URL(getCallUrl(fetchMock)).pathname).toBe(`/v1/niches/rank-radars/${RR_ID}/tags/${TAG_ID}`);
    const init = getCallInit(fetchMock);
    expect(init.method).toBe("PATCH");
    expect(JSON.parse(init.body as string)).toEqual({ title: "Promo week v2" });
    expect(result).toEqual(TAG);
  });

  it("passes an empty description through as the clear signal", async () => {
    const fetchMock = mockFetch({ data: TAG });
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    await updateRankRadarTagTool.handler({ rankRadarId: RR_ID, tagId: TAG_ID, description: "" }, CTX);

    expect(JSON.parse(getCallInit(fetchMock).body as string)).toEqual({ description: "" });
  });

  it("sends a bare {} when only ids are passed, deferring the no-op to the backend", async () => {
    const fetchMock = mockFetch({ data: TAG });
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    await updateRankRadarTagTool.handler({ rankRadarId: RR_ID, tagId: TAG_ID }, CTX);

    expect(JSON.parse(getCallInit(fetchMock).body as string)).toEqual({});
  });

  it("rejects a non-UUID tagId at the schema level", () => {
    expect(() => updateRankRadarTagTool.inputSchema.tagId.parse("not-a-uuid")).toThrow();
    expect(updateRankRadarTagTool.inputSchema.tagId.parse(TAG_ID)).toBe(TAG_ID);
  });
});
