import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { generateListingCopyTool } from "../../src/tools/generate-listing-copy.js";
import { getListingCopyGenerationStatusTool } from "../../src/tools/get-listing-copy-generation-status.js";
import { CTX, CTX_AUTO_CONFIRM, mockFetch, getCallUrl, getCallInit } from "./_helpers.js";

const NICHE_ID = "z515cGOFg3";
const GEN_ID = "b3e1f2c4-7e6a-4d2a-9f1e-123456789abc";
const LISTING = { title: "Water Bottle", bullets: ["32oz", "insulated"] };

describe("generate_listing_copy tool", () => {
  let originalFetch: typeof fetch;
  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });
  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("POSTs to the ai-copywriter endpoint with the API's field names when confirmed", async () => {
    const fetchMock = mockFetch({ data: { generationId: GEN_ID, status: "generating" } });
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const result = await generateListingCopyTool.handler(
      { nicheId: NICHE_ID, strategy: "cosmo", currentListing: LISTING, confirm: true },
      CTX,
    );

    expect(new URL(getCallUrl(fetchMock)).pathname).toBe(`/v1/niches/${NICHE_ID}/ai-copywriter`);
    const init = getCallInit(fetchMock);
    expect(init.method).toBe("POST");
    // The tool surface says strategy/currentListing; the API still says prompt/listingToInclude.
    expect(JSON.parse(init.body as string)).toEqual({ prompt: "cosmo", listingToInclude: LISTING });
    expect(result).toEqual({ generationId: GEN_ID, status: "generating" });
  });

  it("returns confirmation_required and does NOT spend a prompt without confirm", async () => {
    const fetchMock = mockFetch({});
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const result = await generateListingCopyTool.handler(
      { nicheId: NICHE_ID, strategy: "nlp", currentListing: LISTING },
      CTX,
    );

    expect(result).toMatchObject({ status: "confirmation_required" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("proceeds without confirm when autoConfirmWrites is set", async () => {
    const fetchMock = mockFetch({ data: { generationId: GEN_ID, status: "generating" } });
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    await generateListingCopyTool.handler(
      { nicheId: NICHE_ID, strategy: "cosmo-rufus", currentListing: LISTING },
      CTX_AUTO_CONFIRM,
    );

    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it("accepts only the four backend strategies", () => {
    const { strategy } = generateListingCopyTool.inputSchema;
    for (const s of ["cosmo", "ranking-juice", "nlp", "cosmo-rufus"]) {
      expect(strategy.parse(s)).toBe(s);
    }
    expect(() => strategy.parse("creative")).toThrow();
  });
});

describe("get_listing_copy_generation_status tool", () => {
  let originalFetch: typeof fetch;
  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });
  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("GETs the generation and returns the unwrapped status payload", async () => {
    const payload = { generationId: GEN_ID, status: "complete", result: { title: "New title" } };
    const fetchMock = mockFetch({ data: payload });
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const result = await getListingCopyGenerationStatusTool.handler(
      { nicheId: NICHE_ID, generationId: GEN_ID },
      CTX,
    );

    expect(new URL(getCallUrl(fetchMock)).pathname).toBe(
      `/v1/niches/${NICHE_ID}/ai-copywriter/${GEN_ID}`,
    );
    expect(getCallInit(fetchMock).method).toBe("GET");
    expect(result).toEqual(payload);
  });

  it("is read-only, so polling never needs a confirm", () => {
    expect(getListingCopyGenerationStatusTool.annotations.readOnlyHint).toBe(true);
    expect("confirm" in getListingCopyGenerationStatusTool.inputSchema).toBe(false);
  });
});
