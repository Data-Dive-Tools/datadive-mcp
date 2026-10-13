import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createRankRadarTagTool } from "../../src/tools/create-rank-radar-tag.js";
import { CTX, mockFetch, getCallUrl, getCallInit } from "./_helpers.js";

const RR_ID = "3f4a1c2e-5b6d-4e7f-8a9b-0c1d2e3f4a5b";
const KW_ID = "cccccccc-cccc-4ccc-cccc-cccccccccccc";

const TAG = {
  id: "aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa",
  title: "Promo week",
  color: "#C9CFD7",
  description: null,
  startAt: null,
  endAt: null,
  keywordCount: 0,
  createdAt: "2026-10-12T00:00:00.000Z",
};

describe("create_rank_radar_tag tool", () => {
  let originalFetch: typeof fetch;
  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });
  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("POSTs /v1/niches/rank-radars/:rankRadarId/tags with only the fields passed", async () => {
    const fetchMock = mockFetch({ data: TAG });
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const result = await createRankRadarTagTool.handler(
      { rankRadarId: RR_ID, title: "Promo week", color: "#C9CFD7", rankRadarKeywordIds: [KW_ID] },
      CTX,
    );

    expect(new URL(getCallUrl(fetchMock)).pathname).toBe(`/v1/niches/rank-radars/${RR_ID}/tags`);
    const init = getCallInit(fetchMock);
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body as string)).toEqual({
      title: "Promo week",
      color: "#C9CFD7",
      rankRadarKeywordIds: [KW_ID],
    });
    expect(result).toEqual(TAG);
  });

  it("omits optional fields that were not passed, so the backend uses its defaults", async () => {
    const fetchMock = mockFetch({ data: TAG });
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    await createRankRadarTagTool.handler({ rankRadarId: RR_ID, title: "Promo week" }, CTX);

    const body = JSON.parse(getCallInit(fetchMock).body as string);
    expect(body).toEqual({ title: "Promo week" });
    expect(body).not.toHaveProperty("color");
    expect(body).not.toHaveProperty("description");
  });

  it("rejects a title longer than TAG_TITLE_MAX_LENGTH", () => {
    const long = "x".repeat(101);
    expect(() => createRankRadarTagTool.inputSchema.title.parse(long)).toThrow();
    expect(createRankRadarTagTool.inputSchema.title.parse("x".repeat(100))).toHaveLength(100);
  });

  it("rejects a non-#RRGGBB colour at the schema level", () => {
    expect(() => createRankRadarTagTool.inputSchema.color.parse("red")).toThrow();
    expect(() => createRankRadarTagTool.inputSchema.color.parse("#C9D")).toThrow();
    expect(createRankRadarTagTool.inputSchema.color.parse("#C9CFD7")).toBe("#C9CFD7");
  });

  it("rejects more than TAG_KEYWORD_IDS_MAX keyword ids", () => {
    const tooMany = Array.from({ length: 1001 }, () => KW_ID);
    expect(() => createRankRadarTagTool.inputSchema.rankRadarKeywordIds.parse(tooMany)).toThrow();
  });
});
