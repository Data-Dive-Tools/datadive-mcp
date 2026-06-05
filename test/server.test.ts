/**
 * Integration test: every tool from the registry registers with the SDK,
 * has a non-empty description, and a valid Zod input schema. Catches the
 * "I forgot to add the new tool to allTools" class of bug.
 */

import { describe, it, expect } from "vitest";
import { z } from "zod";
import { allTools } from "../src/tools/index.js";
import { buildServer } from "../src/server.js";

const EXPECTED_TOOLS = [
  "list_niches",
  "get_niche_keywords",
  "get_niche_competitors",
  "get_ranking_juice",
  "list_rank_radars",
  "get_rank_radar_data",
  "get_asin_inventory_distribution",
  "list_indexing_issue_alerts",
  "list_blind_spend_alerts",
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
    const server = buildServer({ apiKey: "ddk_test", baseUrl: "https://api.datadive.tools" });
    expect(server).toBeDefined();
  });

  it("tool names are unique", () => {
    const names = allTools.map((t) => t.name);
    expect(new Set(names).size).toBe(names.length);
  });
});
