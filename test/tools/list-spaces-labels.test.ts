import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { listSpacesTool } from "../../src/tools/list-spaces.js";
import { listLabelsTool } from "../../src/tools/list-labels.js";
import { CTX, mockFetch, getCallUrl } from "./_helpers.js";

const tree = [
  {
    id: 1,
    name: "Pet Friends",
    path: "Pet Friends",
    parentId: null,
    children: [{ id: 2, name: "Dog Hat", path: "Pet Friends/Dog Hat", parentId: 1, children: [] }],
  },
];

describe.each([
  ["list_spaces", listSpacesTool, "/v1/spaces"],
  ["list_labels", listLabelsTool, "/v1/labels"],
])("%s tool", (name, tool, path) => {
  let originalFetch: typeof fetch;
  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });
  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("is read-only, takes no input and GETs the tree, unwrapped", async () => {
    const fetchMock = mockFetch({ data: tree });
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const result = await tool.handler({}, CTX);

    expect(tool.name).toBe(name);
    expect(tool.annotations.readOnlyHint).toBe(true);
    expect(Object.keys(tool.inputSchema)).toEqual([]);
    expect(new URL(getCallUrl(fetchMock)).pathname).toBe(path);
    expect(result).toEqual(tree);
  });
});

describe("list_spaces description", () => {
  it("says an MCP user sees only the Spaces they have rights on", () => {
    expect(listSpacesTool.description).toMatch(/only the Spaces they have rights on/);
  });
});
