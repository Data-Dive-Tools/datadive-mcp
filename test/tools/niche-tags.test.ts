import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { addNicheSpacesTool } from "../../src/tools/add-niche-spaces.js";
import { removeNicheSpacesTool } from "../../src/tools/remove-niche-spaces.js";
import { addNicheLabelsTool } from "../../src/tools/add-niche-labels.js";
import { removeNicheLabelsTool } from "../../src/tools/remove-niche-labels.js";
import { CTX, mockFetch, getCallUrl, getCallInit } from "./_helpers.js";

const cases = [
  {
    tool: addNicheSpacesTool,
    name: "add_niche_spaces",
    field: "spaceIds",
    path: "/spaces",
    result: { added: 1, alreadyPresent: 1 },
  },
  {
    tool: removeNicheSpacesTool,
    name: "remove_niche_spaces",
    field: "spaceIds",
    path: "/spaces/remove",
    result: { removed: 1, notPresent: 1 },
  },
  {
    tool: addNicheLabelsTool,
    name: "add_niche_labels",
    field: "labelIds",
    path: "/labels",
    result: { added: 1, alreadyPresent: 1 },
  },
  {
    tool: removeNicheLabelsTool,
    name: "remove_niche_labels",
    field: "labelIds",
    path: "/labels/remove",
    result: { removed: 1, notPresent: 1 },
  },
] as const;

describe.each(cases)("$name tool", ({ tool, name, field, path, result }) => {
  let originalFetch: typeof fetch;
  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });
  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  // The handler is typed to its own schema; the table mixes both, so call it through a loose type.
  const run = (args: Record<string, unknown>) =>
    (tool.handler as (a: Record<string, unknown>, c: typeof CTX) => Promise<unknown>)(args, CTX);

  it("POSTs the ids and returns the counts as-is", async () => {
    const fetchMock = mockFetch({ success: true, data: result });
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const out = await run({ nicheId: "n 1", [field]: [12, 34] });

    expect(tool.name).toBe(name);
    expect(new URL(getCallUrl(fetchMock)).pathname).toBe(`/v1/niches/n%201${path}`);
    const init = getCallInit(fetchMock);
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body as string)).toEqual({ [field]: [12, 34] });
    expect(out).toEqual(result);
  });

  it("is a write tool with no confirm gate", () => {
    expect(tool.annotations).toMatchObject({
      readOnlyHint: false,
      destructiveHint: true,
      openWorldHint: false,
    });
    expect("confirm" in tool.inputSchema).toBe(false);
  });

  it("states the role rule and the all-or-nothing rule", () => {
    expect(tool.description).toMatch(/owner or a team admin/);
    expect(tool.description).toMatch(/all or nothing/);
  });

  it("accepts 1-100 unique positive integers only", () => {
    const ids = (tool.inputSchema as Record<string, { parse: (v: unknown) => unknown }>)[field]!;
    expect(ids.parse([1, 2])).toEqual([1, 2]);
    expect(() => ids.parse([])).toThrow();
    expect(() => ids.parse([1, 1])).toThrow(/same id twice/);
    expect(() => ids.parse([0])).toThrow();
    expect(() => ids.parse([1.5])).toThrow();
    expect(() => ids.parse(Array.from({ length: 101 }, (_, i) => i + 1))).toThrow();
  });

  it("relays the API's INSUFFICIENT_ROLE refusal", async () => {
    globalThis.fetch = mockFetch(
      {
        statusCode: 403,
        error: "INSUFFICIENT_ROLE",
        message: "Only the organization owner or a team admin can change Spaces and labels of a Niche.",
        success: false,
      },
      403,
    ) as unknown as typeof fetch;

    await expect(run({ nicheId: "n-1", [field]: [1] })).rejects.toThrow(
      /Forbidden: Only the organization owner or a team admin/,
    );
  });

  it("keeps the offending ids on the error body for unknown and forbidden ids", async () => {
    globalThis.fetch = mockFetch(
      { statusCode: 404, message: "Some ids are not known", unknownIds: [999] },
      404,
    ) as unknown as typeof fetch;
    await expect(run({ nicheId: "n-1", [field]: [999] })).rejects.toMatchObject({
      body: { unknownIds: [999] },
    });

    globalThis.fetch = mockFetch(
      { statusCode: 403, message: "You cannot manage some", forbiddenSpaceIds: [3] },
      403,
    ) as unknown as typeof fetch;
    await expect(run({ nicheId: "n-1", [field]: [3] })).rejects.toMatchObject({
      body: { forbiddenSpaceIds: [3] },
    });
  });
});
