import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createRankRadarTool } from "../../src/tools/create-rank-radar.js";
import { CTX, CTX_AUTO_CONFIRM, mockFetch, getCallUrl, getCallInit } from "./_helpers.js";

/** The backend's FAMILY_ALREADY_TRACKED warning, as `POST /v1/niches/rank-radars` returns it. */
const FAMILY_WARNING = {
  code: "FAMILY_ALREADY_TRACKED",
  message:
    "This product family is already tracked in another Rank Radar. Creating a second one will " +
    "track the same family again and will use more of your Tracked Search Terms.",
  existingRankRadarIds: ["rr-existing"],
};

const bodyOf = (fetchMock: ReturnType<typeof mockFetch>) =>
  JSON.parse(getCallInit(fetchMock).body as string) as Record<string, unknown>;

describe("create_rank_radar tool", () => {
  let originalFetch: typeof fetch;
  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });
  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("POSTs to /v1/niches/rank-radars with the JSON body when confirmed", async () => {
    const fetchMock = mockFetch({ rankRadarId: "rr-1", warnings: [] });
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const result = await createRankRadarTool.handler(
      { asin: "B08N5WRWNW", numberOfKeywords: 5, nicheId: "z515cGOFg3", confirm: true },
      CTX,
    );

    const url = new URL(getCallUrl(fetchMock));
    expect(url.pathname).toBe("/v1/niches/rank-radars");
    const init = getCallInit(fetchMock);
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body as string)).toEqual({
      asin: "B08N5WRWNW",
      numberOfKeywords: 5,
      nicheId: "z515cGOFg3",
    });
    expect(result).toEqual({ rankRadarId: "rr-1", warnings: [] });
  });

  it("returns confirmation_required without creating anything when confirm is missing", async () => {
    const fetchMock = mockFetch({ rankRadarId: null, warnings: [] });
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const result = await createRankRadarTool.handler(
      { asin: "B08N5WRWNW", numberOfKeywords: 5, nicheId: "z515cGOFg3" },
      CTX,
    );

    expect(result).toMatchObject({ status: "confirmation_required" });
    // The only call is the dry run, which creates nothing and spends nothing.
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(bodyOf(fetchMock).dryRun).toBe(true);
  });

  it("proceeds without confirm when autoConfirmWrites is set", async () => {
    const fetchMock = mockFetch({ rankRadarId: "rr-2" });
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    await createRankRadarTool.handler(
      { asin: "B08N5WRWNW", numberOfKeywords: 1, nicheId: "z515cGOFg3" },
      CTX_AUTO_CONFIRM,
    );

    expect(fetchMock).toHaveBeenCalledOnce();
    expect(bodyOf(fetchMock).dryRun).toBeUndefined();
  });

  it("rejects numberOfKeywords < 1 at the schema level", () => {
    const schema = createRankRadarTool.inputSchema;
    expect(() => schema.numberOfKeywords.parse(0)).toThrow();
    expect(schema.numberOfKeywords.parse(1)).toBe(1);
  });

  // ── RS-11615: the dry-run preview and its warnings ────────────────────────────

  describe("duplicate-family warning (RS-11615)", () => {
    it("folds the dry run's warnings into the confirmation payload, next to the cost note", async () => {
      const fetchMock = mockFetch({ rankRadarId: null, warnings: [FAMILY_WARNING] });
      globalThis.fetch = fetchMock as unknown as typeof fetch;

      const result = await createRankRadarTool.handler(
        { asin: "B08N5WRWNW", numberOfKeywords: 5, nicheId: "z515cGOFg3" },
        CTX,
      );

      expect(result).toEqual({
        status: "confirmation_required",
        message: expect.stringContaining("confirm: true"),
        costNote: expect.stringContaining("5 requested"),
        warnings: [FAMILY_WARNING],
      });
    });

    it("omits warnings from the confirmation payload when the API flags nothing", async () => {
      const fetchMock = mockFetch({ rankRadarId: null, warnings: [] });
      globalThis.fetch = fetchMock as unknown as typeof fetch;

      const result = await createRankRadarTool.handler(
        { asin: "B08N5WRWNW", numberOfKeywords: 5, nicheId: "z515cGOFg3" },
        CTX,
      );

      expect(result).not.toHaveProperty("warnings");
    });

    it("sends dryRun on the unconfirmed pass and never on the confirmed one", async () => {
      const previewFetch = mockFetch({ rankRadarId: null, warnings: [FAMILY_WARNING] });
      globalThis.fetch = previewFetch as unknown as typeof fetch;
      await createRankRadarTool.handler({ asin: "B08N5WRWNW", numberOfKeywords: 5, nicheId: "n1" }, CTX);
      expect(bodyOf(previewFetch)).toEqual({
        asin: "B08N5WRWNW",
        numberOfKeywords: 5,
        nicheId: "n1",
        dryRun: true,
      });

      const createFetch = mockFetch({ rankRadarId: "rr-3", warnings: [FAMILY_WARNING] });
      globalThis.fetch = createFetch as unknown as typeof fetch;
      await createRankRadarTool.handler(
        { asin: "B08N5WRWNW", numberOfKeywords: 5, nicheId: "n1", confirm: true },
        CTX,
      );
      expect(bodyOf(createFetch)).not.toHaveProperty("dryRun");
    });

    it("returns the API's warnings on a real create, which is all the auto-confirm path ever sees", async () => {
      const fetchMock = mockFetch({ rankRadarId: "rr-4", warnings: [FAMILY_WARNING] });
      globalThis.fetch = fetchMock as unknown as typeof fetch;

      const result = await createRankRadarTool.handler(
        { asin: "B08N5WRWNW", numberOfKeywords: 5, nicheId: "n1" },
        CTX_AUTO_CONFIRM,
      );

      expect(result).toEqual({ rankRadarId: "rr-4", warnings: [FAMILY_WARNING] });
    });

    /**
     * `dryRun` must stay invisible to the model: one that could set it could dry-run, read a
     * success-shaped response, and report a Rank Radar that was never created. The schema does
     * not declare it and the handler builds the request body from named fields, so an argument
     * called `dryRun` cannot reach the API either way.
     */
    it("does not advertise dryRun in its input schema", () => {
      expect(Object.keys(createRankRadarTool.inputSchema)).toEqual([
        "asin",
        "numberOfKeywords",
        "nicheId",
        "confirm",
      ]);
    });

    it("ignores a dryRun passed in the tool arguments on the confirmed pass", async () => {
      const fetchMock = mockFetch({ rankRadarId: "rr-5" });
      globalThis.fetch = fetchMock as unknown as typeof fetch;

      await createRankRadarTool.handler(
        {
          asin: "B08N5WRWNW",
          numberOfKeywords: 5,
          nicheId: "n1",
          confirm: true,
          dryRun: true,
        } as Parameters<typeof createRankRadarTool.handler>[0],
        CTX,
      );

      expect(bodyOf(fetchMock)).not.toHaveProperty("dryRun");
    });

    /**
     * A backend predating RS-11615 ignores the unknown `dryRun` field and really creates the
     * Rank Radar — betrayed by an id where a dry run returns null. Claiming a confirmation is
     * still pending would tell the user nothing was spent when it was.
     */
    it("reports the creation when the API ignored dryRun and created it anyway", async () => {
      const fetchMock = mockFetch({ rankRadarId: "rr-oops" });
      globalThis.fetch = fetchMock as unknown as typeof fetch;

      const result = await createRankRadarTool.handler(
        { asin: "B08N5WRWNW", numberOfKeywords: 5, nicheId: "n1" },
        CTX,
      );

      expect(result).toEqual({ rankRadarId: "rr-oops" });
      expect(fetchMock).toHaveBeenCalledOnce();
    });
  });
});
