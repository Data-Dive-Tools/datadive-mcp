/**
 * Integration test: every tool from the registry registers with the SDK,
 * has a non-empty description, and a valid Zod input schema. Catches the
 * "I forgot to add the new tool to allTools" class of bug.
 */

import { describe, it, expect, afterEach, vi } from "vitest";
import { z } from "zod";
import { allTools } from "../src/tools/index.js";
import { buildServer, requiredScope } from "../src/server.js";
import { SCOPE_READ, SCOPE_WRITE, type Config } from "../src/config.js";

const TEST_CONFIG: Config = {
  credentials: { kind: "api-key", apiKey: "ddk_test" },
  baseUrl: "https://api.datadive.tools",
  autoConfirmWrites: false,
};

const WRITE_TOOLS = [
  "run_fast_keywords",
  "refresh_fast_keywords",
  "create_niche_dive",
  "create_niche_dive_from_competitors_list",
  "redive_niche",
  "add_niche_keywords",
  "remove_niche_keywords",
  "add_keyword_exclusions",
  "remove_keyword_exclusions",
  "create_rank_radar",
  "add_rank_radar_search_terms",
  "pause_rank_radar_search_terms",
  "resume_rank_radar_search_terms",
  "pause_rank_radar",
  "resume_rank_radar",
  "delete_rank_radar",
  "delete_niche",
  "generate_listing_copy",
  "create_rank_radar_tag",
  "update_rank_radar_tag",
  "delete_rank_radar_tag",
  "add_rank_radar_tag_search_terms",
  "remove_rank_radar_tag_search_terms",
];

/**
 * Write tools that require `confirm: true` before they touch the API. The gate is
 * reserved for actions that cannot be undone: data loss (the two deletes) or a
 * permanent token spend (dives, rank radar creation, listing copy). Pause/resume
 * and add-search-terms only move Daily Tracked Keywords capacity, which the backend
 * refunds on pause/delete, so they are reversible and are NOT gated (RS-11529).
 * add_niche_keywords is gated only on a stale niche, where it re-dives (RS-11860);
 * run_fast_keywords and refresh_fast_keywords spend 1 Dive token (RS-12020), so they are gated on a dry-run
 * preview. remove_niche_keywords and the keyword exclusion tools are free and undone by their
 * counterparts, so they are not (RS-11864).
 */
const CONFIRM_GATED_TOOLS = [
  "run_fast_keywords",
  "refresh_fast_keywords",
  "create_niche_dive",
  "create_niche_dive_from_competitors_list",
  "redive_niche",
  "add_niche_keywords",
  "create_rank_radar",
  "delete_niche",
  "delete_rank_radar",
  "delete_rank_radar_tag",
  "generate_listing_copy",
];

const EXPECTED_TOOLS = [
  "list_niches",
  "list_fast_keywords",
  "get_fast_keywords",
  "get_fast_keywords_keywords",
  "run_fast_keywords",
  "refresh_fast_keywords",
  "get_niche_keywords",
  "list_keyword_exclusions",
  "get_niche_roots",
  "get_niche_competitors",
  "get_ranking_juice",
  "list_rank_radars",
  "get_rank_radar_data",
  "get_rank_radar_sqp_data",
  "get_rank_radar_ppc_data",
  "list_rank_radar_tags",
  "create_rank_radar_tag",
  "update_rank_radar_tag",
  "delete_rank_radar_tag",
  "add_rank_radar_tag_search_terms",
  "remove_rank_radar_tag_search_terms",
  "create_rank_radar",
  "create_niche_dive",
  "create_niche_dive_from_competitors_list",
  "redive_niche",
  "get_dive_status",
  "add_niche_keywords",
  "remove_niche_keywords",
  "add_keyword_exclusions",
  "remove_keyword_exclusions",
  "add_rank_radar_search_terms",
  "pause_rank_radar_search_terms",
  "resume_rank_radar_search_terms",
  "pause_rank_radar",
  "resume_rank_radar",
  "delete_rank_radar",
  "delete_niche",
  "generate_listing_copy",
  "get_listing_copy_generation_status",
  "list_seller_profiles",
  "get_seller_catalog",
  "get_seller_listing_changes",
  "list_ppc_campaigns",
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

  it("exactly the irreversible write tools expose a `confirm` argument", () => {
    for (const tool of allTools) {
      const hasConfirm = "confirm" in tool.inputSchema;
      expect(hasConfirm, `${tool.name} confirm gate`).toBe(CONFIRM_GATED_TOOLS.includes(tool.name));
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
  const originalFetch = globalThis.fetch;
  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  /**
   * Since RS-11615 create_rank_radar's unconfirmed pass previews the creation with
   * `dryRun: true` rather than answering offline, so reaching its confirm gate now needs
   * a reachable API. This stubs that dry run: nothing created, nothing flagged.
   */
  function stubDryRun() {
    globalThis.fetch = vi.fn(
      async () =>
        new Response(JSON.stringify({ rankRadarId: null, warnings: [] }), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
    ) as unknown as typeof fetch;
  }

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

  it("allows a write tool with datadive.write (reaches the confirm gate)", async () => {
    stubDryRun();
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
    stubDryRun();
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
