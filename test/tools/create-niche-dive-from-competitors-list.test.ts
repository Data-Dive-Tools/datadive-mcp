import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { z } from "zod";
import { createNicheDiveFromCompetitorsListTool } from "../../src/tools/create-niche-dive-from-competitors-list.js";
import { CTX, CTX_AUTO_CONFIRM, mockFetch, getCallUrl, getCallInit } from "./_helpers.js";

const schema = z.object(createNicheDiveFromCompetitorsListTool.inputSchema);
const RESULT = { diveId: "d-1", estimatedCompletionDate: "2026-09-28T01:00:00Z" };

describe("create_niche_dive_from_competitors_list tool", () => {
  let originalFetch: typeof fetch;
  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });
  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("POSTs the marketplace and ASIN list to /v1/niches/dive_with_competitors when confirmed", async () => {
    const fetchMock = mockFetch({ success: true, data: RESULT });
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const result = await createNicheDiveFromCompetitorsListTool.handler(
      { marketplace: "com", asins: ["B08N5WRWNW", "B09617YV4C"], confirm: true },
      CTX,
    );

    expect(new URL(getCallUrl(fetchMock)).pathname).toBe("/v1/niches/dive_with_competitors");
    const init = getCallInit(fetchMock);
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body as string)).toEqual({
      marketplace: "com",
      asins: ["B08N5WRWNW", "B09617YV4C"],
    });
    expect(result).toEqual(RESULT);
  });

  it("returns confirmation_required with the ASIN count and does NOT call the API without confirm", async () => {
    const fetchMock = mockFetch({});
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const result = await createNicheDiveFromCompetitorsListTool.handler(
      { marketplace: "com", asins: ["B08N5WRWNW", "B09617YV4C", "B0ABCDEFGH"] },
      CTX,
    );

    expect(result).toMatchObject({ status: "confirmation_required" });
    expect(JSON.stringify(result)).toContain("3 ASINs");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("proceeds without confirm when autoConfirmWrites is set", async () => {
    const fetchMock = mockFetch({ success: true, data: RESULT });
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    await createNicheDiveFromCompetitorsListTool.handler(
      { marketplace: "com", asins: ["B08N5WRWNW", "B09617YV4C"] },
      CTX_AUTO_CONFIRM,
    );

    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it("normalises ASINs the way the API does, so a case-only duplicate is refused before any spend", () => {
    expect(schema.parse({ marketplace: "com", asins: [" b08n5wrwnw", "B09617YV4C"] }).asins).toEqual([
      "B08N5WRWNW",
      "B09617YV4C",
    ]);
    expect(() => schema.parse({ marketplace: "com", asins: ["B08N5WRWNW", "b08n5wrwnw"] })).toThrow(/twice/);
  });

  it("enforces 2 to 200 ASINs and a supported marketplace", () => {
    const asins = (n: number) => Array.from({ length: n }, (_, i) => `B0${String(i).padStart(8, "0")}`);
    expect(() => schema.parse({ marketplace: "com", asins: asins(1) })).toThrow();
    expect(() => schema.parse({ marketplace: "com", asins: asins(2) })).not.toThrow();
    expect(() => schema.parse({ marketplace: "com", asins: asins(200) })).not.toThrow();
    expect(() => schema.parse({ marketplace: "com", asins: asins(201) })).toThrow();
    expect(() => schema.parse({ marketplace: "uk", asins: asins(2) })).toThrow();
  });
});
