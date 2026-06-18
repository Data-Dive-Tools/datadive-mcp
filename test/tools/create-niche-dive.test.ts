import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createNicheDiveTool } from "../../src/tools/create-niche-dive.js";
import { CTX, CTX_AUTO_CONFIRM, mockFetch, getCallUrl, getCallInit } from "./_helpers.js";

describe("create_niche_dive tool", () => {
  let originalFetch: typeof fetch;
  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });
  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("POSTs to /v1/niches/dives with the JSON body when confirmed", async () => {
    const fetchMock = mockFetch({ diveId: "d-1", estimatedCompletionDate: "2026-06-19T00:00:00Z" });
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const result = await createNicheDiveTool.handler(
      { marketplace: "com", asin: "B08N5WRWNW", numberOfCompetitors: 3, confirm: true },
      CTX,
    );

    const url = new URL(getCallUrl(fetchMock));
    expect(url.pathname).toBe("/v1/niches/dives");
    const init = getCallInit(fetchMock);
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body as string)).toEqual({
      marketplace: "com",
      asin: "B08N5WRWNW",
      numberOfCompetitors: 3,
    });
    expect(result).toEqual({ diveId: "d-1", estimatedCompletionDate: "2026-06-19T00:00:00Z" });
  });

  it("returns confirmation_required and does NOT call the API without confirm", async () => {
    const fetchMock = mockFetch({});
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const result = await createNicheDiveTool.handler(
      { marketplace: "com", asin: "B08N5WRWNW", numberOfCompetitors: 3 },
      CTX,
    );

    expect(result).toMatchObject({ status: "confirmation_required" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("proceeds without confirm when autoConfirmWrites is set", async () => {
    const fetchMock = mockFetch({ diveId: "d-2", estimatedCompletionDate: "2026-06-19T00:00:00Z" });
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    await createNicheDiveTool.handler(
      { marketplace: "com", asin: "B08N5WRWNW", numberOfCompetitors: 2 },
      CTX_AUTO_CONFIRM,
    );

    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it("rejects numberOfCompetitors < 2 and bad marketplace at the schema level", () => {
    const schema = createNicheDiveTool.inputSchema;
    expect(() => schema.numberOfCompetitors.parse(1)).toThrow();
    expect(schema.numberOfCompetitors.parse(2)).toBe(2);
    expect(() => schema.marketplace.parse("uk")).toThrow();
    expect(schema.marketplace.parse("co.uk")).toBe("co.uk");
  });

  it("is flagged as a non-read-only, destructive tool", () => {
    expect(createNicheDiveTool.annotations?.readOnlyHint).toBe(false);
    expect(createNicheDiveTool.annotations?.destructiveHint).toBe(true);
  });
});
