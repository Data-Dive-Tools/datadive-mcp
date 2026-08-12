import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { rediveNicheTool } from "../../src/tools/redive-niche.js";
import { CTX, CTX_AUTO_CONFIRM, mockFetch, getCallUrl, getCallInit } from "./_helpers.js";

describe("redive_niche tool", () => {
  let originalFetch: typeof fetch;
  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });
  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("POSTs mode-only body to /v1/niches/:nicheId/redive for same_competitors", async () => {
    const fetchMock = mockFetch({
      success: true,
      data: { diveId: "d-1", estimatedCompletionDate: "2026-08-19T00:00:00Z" },
    });
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const result = await rediveNicheTool.handler(
      { nicheId: "n-1", mode: "same_competitors", confirm: true },
      CTX,
    );

    const url = new URL(getCallUrl(fetchMock));
    expect(url.pathname).toBe("/v1/niches/n-1/redive");
    const init = getCallInit(fetchMock);
    expect(init.method).toBe("POST");
    // The unused discover-only fields must not reach the wire — the API rejects them in this mode.
    expect(JSON.parse(init.body as string)).toEqual({ mode: "same_competitors" });
    // The endpoint answers with the ResponseDto envelope, which the client unwraps.
    expect(result).toEqual({ diveId: "d-1", estimatedCompletionDate: "2026-08-19T00:00:00Z" });
  });

  it("forwards the discover-mode competitor controls", async () => {
    const fetchMock = mockFetch({
      success: true,
      data: { diveId: "d-2", estimatedCompletionDate: "2026-08-19T00:00:00Z" },
    });
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    await rediveNicheTool.handler(
      {
        nicheId: "n-2",
        mode: "discover",
        numberOfCompetitors: 12,
        heroAsin: "B08N5WRWNW",
        lockedAsins: ["B08N5WRWNW", "B09617YV4C"],
        excludedAsins: ["B07XHRSRZ2"],
        confirm: true,
      },
      CTX,
    );

    expect(JSON.parse(getCallInit(fetchMock).body as string)).toEqual({
      mode: "discover",
      numberOfCompetitors: 12,
      heroAsin: "B08N5WRWNW",
      lockedAsins: ["B08N5WRWNW", "B09617YV4C"],
      excludedAsins: ["B07XHRSRZ2"],
    });
  });

  it("encodes the nicheId into the path", async () => {
    const fetchMock = mockFetch({ success: true, data: { diveId: "d-3", estimatedCompletionDate: "" } });
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    await rediveNicheTool.handler({ nicheId: "n/3 4", mode: "same_competitors", confirm: true }, CTX);

    expect(getCallUrl(fetchMock)).toContain("/v1/niches/n%2F3%204/redive");
  });

  it("returns confirmation_required and does NOT call the API without confirm", async () => {
    const fetchMock = mockFetch({});
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const result = await rediveNicheTool.handler(
      { nicheId: "n-1", mode: "discover", numberOfCompetitors: 5 },
      CTX,
    );

    expect(result).toMatchObject({ status: "confirmation_required" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("notes the per-ASIN cost in discover mode and the unknown count in same_competitors mode", async () => {
    const fetchMock = mockFetch({});
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const discover = (await rediveNicheTool.handler(
      { nicheId: "n-1", mode: "discover", numberOfCompetitors: 7 },
      CTX,
    )) as { costNote: string };
    expect(discover.costNote).toContain("7 requested");

    const same = (await rediveNicheTool.handler({ nicheId: "n-1", mode: "same_competitors" }, CTX)) as {
      costNote: string;
    };
    expect(same.costNote).toContain("get_niche_competitors");
  });

  it("proceeds without confirm when autoConfirmWrites is set", async () => {
    const fetchMock = mockFetch({ success: true, data: { diveId: "d-4", estimatedCompletionDate: "" } });
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    await rediveNicheTool.handler({ nicheId: "n-1", mode: "same_competitors" }, CTX_AUTO_CONFIRM);

    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it("rejects an unknown mode and numberOfCompetitors < 2 at the schema level", () => {
    const schema = rediveNicheTool.inputSchema;
    expect(() => schema.mode.parse("same-competitors")).toThrow();
    expect(schema.mode.parse("discover")).toBe("discover");
    expect(() => schema.numberOfCompetitors.parse(1)).toThrow();
    expect(schema.numberOfCompetitors.parse(2)).toBe(2);
    // Optional in the schema because same_competitors mode forbids it; the API enforces
    // that discover mode supplies it.
    expect(schema.numberOfCompetitors.parse(undefined)).toBeUndefined();
  });

  it("is flagged as a non-read-only, destructive tool", () => {
    expect(rediveNicheTool.annotations?.readOnlyHint).toBe(false);
    expect(rediveNicheTool.annotations?.destructiveHint).toBe(true);
  });
});
