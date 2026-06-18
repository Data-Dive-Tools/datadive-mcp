import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { getDiveStatusTool } from "../../src/tools/get-dive-status.js";
import { CTX, mockFetch, getCallUrl } from "./_helpers.js";

describe("get_dive_status tool", () => {
  let originalFetch: typeof fetch;
  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });
  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("GETs /v1/niches/dives/{diveId} with the id URL-encoded", async () => {
    const fetchMock = mockFetch({ diveId: "d/1", status: "in_progress", estimatedCompletionDate: "2026-06-19T00:00:00Z" });
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    await getDiveStatusTool.handler({ diveId: "d/1" }, CTX);

    const url = new URL(getCallUrl(fetchMock));
    expect(url.pathname).toBe("/v1/niches/dives/d%2F1");
  });

  it("passes through each of the three status shapes", async () => {
    const shapes = [
      { diveId: "d", status: "in_progress", estimatedCompletionDate: "2026-06-19T00:00:00Z" },
      { diveId: "d", status: "success", nicheId: "n-1", tokensUsed: 30, tokensLeft: 1000 },
      { diveId: "d", status: "error", error: "boom" },
    ];
    for (const shape of shapes) {
      globalThis.fetch = mockFetch(shape) as unknown as typeof fetch;
      const result = await getDiveStatusTool.handler({ diveId: "d" }, CTX);
      expect(result).toEqual(shape);
    }
  });

  it("is flagged read-only", () => {
    expect(getDiveStatusTool.annotations?.readOnlyHint).toBe(true);
  });
});
