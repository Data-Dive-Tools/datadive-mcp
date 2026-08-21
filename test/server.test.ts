/**
 * Integration test: every tool from the registry registers with the SDK,
 * has a non-empty description, and a valid Zod input schema. Catches the
 * "I forgot to add the new tool to allTools" class of bug.
 */

import { describe, it, expect } from "vitest";
import { z } from "zod";
import { allTools } from "../src/tools/index.js";
import { buildServer, requiredScope } from "../src/server.js";
import { SCOPE_READ, SCOPE_WRITE, type Config } from "../src/config.js";

const TEST_CONFIG: Config = {
  credentials: { kind: "api-key", apiKey: "ddk_test" },
  baseUrl: "https://api.datadive.tools",
  autoConfirmWrites: false,
};

const WRITE_TOOLS = ["create_niche_dive", "redive_niche", "create_rank_radar"];

const EXPECTED_TOOLS = [
  "list_niches",
  "get_niche_keywords",
  "get_niche_roots",
  "get_niche_competitors",
  "get_ranking_juice",
  "list_rank_radars",
  "get_rank_radar_data",
  "create_rank_radar",
  "create_niche_dive",
  "redive_niche",
  "get_dive_status",
  "list_seller_profiles",
  "get_seller_catalog",
  "get_seller_listing_changes",
  "get_asin_inventory_distribution",
  "list_indexing_issue_alerts",
  "list_blind_spend_alerts",
  "get_quota",
  "list_usage",
];

describe("tool registry", () => {
  it("contains exactly the expected v1 tool surface", () => {
    expect(allTools.map((t) => t.name).sort()).toEqual([...EXPECTED_TOOLS].sort());
  });

  it("every tool has a usable description (>= 80 chars, mentions a use case)", () => {
    for (const tool of allTools) {
      expect(tool.description.length, `${tool.name} description too short`).toBeGreaterThanOrEqual(80);
      // Each description follows the convention "Use this when..."
      expect(tool.description, `${tool.name} should lead with selection guidance`).toMatch(/use this/i);
    }
  });

  it("every tool has a non-empty title", () => {
    for (const tool of allTools) {
      expect(tool.title.length, `${tool.name} title empty`).toBeGreaterThan(0);
    }
  });

  it("every tool's inputSchema is a parseable Zod object", () => {
    for (const tool of allTools) {
      const obj = z.object(tool.inputSchema);
      // Empty object input must be parseable for tools with all-optional schemas
      // (list_niches, list_rank_radars). Tools with required fields will throw on {} —
      // that's fine; we just confirm the schema is constructible.
      expect(typeof obj.parse).toBe("function");
    }
  });

  it("buildServer registers without throwing", () => {
    const server = buildServer(TEST_CONFIG);
    expect(server).toBeDefined();
  });

  it("tool names are unique", () => {
    const names = allTools.map((t) => t.name);
    expect(new Set(names).size).toBe(names.length);
  });

  // `annotations` is required on ToolDefinition, so no optional chaining here: the
  // compiler already rejects a tool that omits it, and this pins the values a
  // connector directory reviews (epic RS-11272 / RS-11397).
  it("every tool carries a read/write annotation (readOnlyHint or destructiveHint)", () => {
    for (const tool of allTools) {
      if (WRITE_TOOLS.includes(tool.name)) {
        expect(tool.annotations.readOnlyHint, `${tool.name} must not be read-only`).toBe(false);
        expect(tool.annotations.destructiveHint, `${tool.name} must carry destructiveHint`).toBe(true);
        // OpenAI's plugin review requires openWorldHint on write tools. Our writes only
        // touch the caller's own DataDive account — a closed system — so it is false.
        expect(tool.annotations.openWorldHint, `${tool.name} must carry openWorldHint`).toBe(false);
      } else {
        expect(tool.annotations.readOnlyHint, `${tool.name} must carry readOnlyHint`).toBe(true);
      }
    }
  });

  it("requiredScope maps read tools to SCOPE_READ and write tools to SCOPE_WRITE", () => {
    for (const tool of allTools) {
      const expected = WRITE_TOOLS.includes(tool.name) ? SCOPE_WRITE : SCOPE_READ;
      expect(requiredScope(tool), tool.name).toBe(expected);
    }
  });
});

describe("scope gating", () => {
  // Registers the tools against a stub transport-less server and calls the
  // registered callback directly via the SDK's internal registry.
  async function callTool(
    name: string,
    scopes: readonly string[] | undefined,
    args: Record<string, unknown>,
  ) {
    const server = buildServer({ ...TEST_CONFIG, scopes });
    // @ts-expect-error - _registeredTools is SDK-internal but stable; avoids a full transport harness
    const registered = server._registeredTools[name];
    expect(registered).toBeDefined();
    return registered.handler(args, {});
  }

  it("blocks a write tool without datadive.write", async () => {
    const result = await callTool("create_rank_radar", [SCOPE_READ], {
      asin: "B000000000",
      numberOfKeywords: 5,
      nicheId: "niche-1",
      confirm: false,
    });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("datadive.write");
  });

  it("blocks a read tool without datadive.read", async () => {
    const result = await callTool("get_quota", [], {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("datadive.read");
  });

  it("allows a write tool with datadive.write (reaches the confirm gate, no API call)", async () => {
    const result = await callTool("create_rank_radar", [SCOPE_READ, SCOPE_WRITE], {
      asin: "B000000000",
      numberOfKeywords: 5,
      nicheId: "niche-1",
      confirm: false,
    });
    expect(result.isError).toBeUndefined();
    expect(result.content[0].text).toContain("confirmation_required");
  });

  it("does not gate when scopes are unset (stdio path)", async () => {
    const result = await callTool("create_rank_radar", undefined, {
      asin: "B000000000",
      numberOfKeywords: 5,
      nicheId: "niche-1",
      confirm: false,
    });
    expect(result.isError).toBeUndefined();
    expect(result.content[0].text).toContain("confirmation_required");
  });
});
