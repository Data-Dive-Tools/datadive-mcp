import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { deleteNicheTool } from "../../src/tools/delete-niche.js";
import { CTX, CTX_AUTO_CONFIRM, mockNoContentFetch, getCallUrl, getCallInit } from "./_helpers.js";

describe("delete_niche tool", () => {
  let originalFetch: typeof fetch;
  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });
  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("DELETEs /v1/niches/:nicheId when confirmed and reports the deletion", async () => {
    // The endpoint answers 204 No Content — an empty body, not JSON.
    const fetchMock = mockNoContentFetch();
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const result = await deleteNicheTool.handler({ nicheId: "z515cGOFg3", confirm: true }, CTX);

    const url = new URL(getCallUrl(fetchMock));
    expect(url.pathname).toBe("/v1/niches/z515cGOFg3");
    expect(getCallInit(fetchMock).method).toBe("DELETE");
    expect(result).toEqual({ status: "deleted", nicheId: "z515cGOFg3" });
  });

  it("returns confirmation_required and does NOT call the API without confirm", async () => {
    const fetchMock = mockNoContentFetch();
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const result = await deleteNicheTool.handler({ nicheId: "z515cGOFg3" }, CTX);

    expect(result).toMatchObject({ status: "confirmation_required" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("proceeds without confirm when autoConfirmWrites is set", async () => {
    const fetchMock = mockNoContentFetch();
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    await deleteNicheTool.handler({ nicheId: "z515cGOFg3" }, CTX_AUTO_CONFIRM);

    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it("encodes the nicheId into the path", async () => {
    const fetchMock = mockNoContentFetch();
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    await deleteNicheTool.handler({ nicheId: "a/b c", confirm: true }, CTX);

    expect(new URL(getCallUrl(fetchMock)).pathname).toBe("/v1/niches/a%2Fb%20c");
  });
});
