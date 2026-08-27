/**
 * Archive / resume tools for a whole Rank Radar. These are deliberately NOT
 * confirm-gated: they only move Daily Tracked Keywords capacity, which the backend
 * refunds on pause, and each is undone by its counterpart (RS-11529).
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { archiveRankRadarTool } from "../../src/tools/archive-rank-radar.js";
import { resumeRankRadarTool } from "../../src/tools/resume-rank-radar.js";
import { CTX, mockNoContentFetch, getCallUrl, getCallInit } from "./_helpers.js";

const RR_ID = "3f4a1c2e-5b6d-4e7f-8a9b-0c1d2e3f4a5b";

describe("archive_rank_radar / resume_rank_radar tools", () => {
  let originalFetch: typeof fetch;
  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });
  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it.each([
    ["archive", archiveRankRadarTool, "archived"],
    ["resume", resumeRankRadarTool, "resumed"],
  ] as const)("%s POSTs to the lifecycle endpoint and reports the new state", async (verb, tool, status) => {
    const fetchMock = mockNoContentFetch();
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const result = await tool.handler({ rankRadarId: RR_ID }, CTX);

    expect(new URL(getCallUrl(fetchMock)).pathname).toBe(`/v1/niches/rank-radars/${RR_ID}/${verb}`);
    expect(getCallInit(fetchMock).method).toBe("POST");
    expect(result).toEqual({ status, rankRadarId: RR_ID });
  });

  it("runs without a confirm argument — neither tool is gated", async () => {
    const fetchMock = mockNoContentFetch();
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    await archiveRankRadarTool.handler({ rankRadarId: RR_ID }, CTX);
    await resumeRankRadarTool.handler({ rankRadarId: RR_ID }, CTX);

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect("confirm" in archiveRankRadarTool.inputSchema).toBe(false);
    expect("confirm" in resumeRankRadarTool.inputSchema).toBe(false);
  });
});
