import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { addRankRadarSearchTermsTool } from "../../src/tools/add-rank-radar-search-terms.js";
import { archiveRankRadarSearchTermsTool } from "../../src/tools/archive-rank-radar-search-terms.js";
import { resumeRankRadarSearchTermsTool } from "../../src/tools/resume-rank-radar-search-terms.js";
import { CTX, mockFetch, mockNoContentFetch, getCallUrl, getCallInit } from "./_helpers.js";

const RR_ID = "3f4a1c2e-5b6d-4e7f-8a9b-0c1d2e3f4a5b";
const KW_IDS = ["11111111-1111-4111-8111-111111111111", "22222222-2222-4222-8222-222222222222"];

describe("add_rank_radar_search_terms tool", () => {
  let originalFetch: typeof fetch;
  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });
  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("POSTs the search terms and returns the unwrapped breakdown", async () => {
    const payload = {
      originBreakdown: { manual: ["dog raincoat"], suggestions: [], tracked: [], paused: [], outliers: [], residues: [], ppc: [] },
      keywordToRankRadarKeywordIdMap: { "dog raincoat": KW_IDS[0] },
    };
    const fetchMock = mockFetch({ data: payload });
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const result = await addRankRadarSearchTermsTool.handler(
      { rankRadarId: RR_ID, searchTerms: ["dog raincoat"] },
      CTX,
    );

    expect(new URL(getCallUrl(fetchMock)).pathname).toBe(`/v1/niches/rank-radars/${RR_ID}/search-terms`);
    const init = getCallInit(fetchMock);
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body as string)).toEqual({ searchTerms: ["dog raincoat"] });
    expect(result).toEqual(payload);
  });

  it("rejects an empty term list and over-long batches at the schema level", () => {
    const { searchTerms } = addRankRadarSearchTermsTool.inputSchema;
    expect(() => searchTerms.parse([])).toThrow();
    expect(() => searchTerms.parse(Array.from({ length: 1001 }, (_, i) => `term ${i}`))).toThrow();
    expect(searchTerms.parse(["ok"])).toEqual(["ok"]);
  });
});

describe("archive/resume_rank_radar_search_terms tools", () => {
  let originalFetch: typeof fetch;
  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });
  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it.each([
    ["archive", archiveRankRadarSearchTermsTool, "archived"],
    ["resume", resumeRankRadarSearchTermsTool, "resumed"],
  ] as const)("%s POSTs the keyword ids and reports the new state", async (verb, tool, status) => {
    const fetchMock = mockNoContentFetch();
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const result = await tool.handler({ rankRadarId: RR_ID, rankRadarKeywordIds: KW_IDS }, CTX);

    expect(new URL(getCallUrl(fetchMock)).pathname).toBe(
      `/v1/niches/rank-radars/${RR_ID}/search-terms/${verb}`,
    );
    const init = getCallInit(fetchMock);
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body as string)).toEqual({ rankRadarKeywordIds: KW_IDS });
    expect(result).toEqual({ status, rankRadarId: RR_ID, rankRadarKeywordIds: KW_IDS });
  });

  it("requires at least one keyword id, and UUIDs rather than keyword text", () => {
    const { rankRadarKeywordIds } = archiveRankRadarSearchTermsTool.inputSchema;
    expect(() => rankRadarKeywordIds.parse([])).toThrow();
    expect(() => rankRadarKeywordIds.parse(["dog raincoat"])).toThrow();
    expect(rankRadarKeywordIds.parse(KW_IDS)).toEqual(KW_IDS);
  });
});
