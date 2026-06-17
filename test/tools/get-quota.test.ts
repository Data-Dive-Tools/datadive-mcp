import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { getQuotaTool } from "../../src/tools/get-quota.js";
import { CTX, mockFetch, getCallUrl } from "./_helpers.js";

describe("get_quota tool", () => {
  let originalFetch: typeof fetch;
  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });
  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("calls /v1/quota and returns the bare object body unchanged", async () => {
    const body = {
      nextRefreshDate: "2026-07-01T00:00:00.000Z",
      features: {
        DIVED_ASINS: { used: 42, capacity: 250 },
        RANK_RADAR_KEYWORDS: { used: 10, capacity: 100 },
        PRODUCT_BRIEF_ASINS: { used: 0, capacity: null },
        AI_COPYWRITER_PROMPTS: { used: 3, capacity: 50 },
      },
    };
    const fetchMock = mockFetch(body);
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const result = await getQuotaTool.handler({}, CTX);
    expect(getCallUrl(fetchMock)).toBe("https://api.datadive.tools/v1/quota");
    expect(result).toEqual(body);
  });
});
