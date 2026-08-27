import { z } from "zod";
import { httpPost } from "../http/client.js";
import { ADD_SEARCH_TERMS_MAX, type AddSearchTermsResult } from "../types/api.js";
import type { ToolDefinition } from "./types.js";

const inputSchema = {
  rankRadarId: z
    .string()
    .uuid()
    .describe("The Rank Radar UUID to add the search terms to (from `list_rank_radars`)."),
  searchTerms: z
    .array(z.string().min(1))
    .min(1)
    .max(ADD_SEARCH_TERMS_MAX)
    .describe(
      `The keywords to start tracking, 1–${ADD_SEARCH_TERMS_MAX} per call. Must be unique. Amazon-ignored ` +
        "special characters (@, #, _, parentheses, …) are rejected.",
    ),
};

export const addRankRadarSearchTermsTool: ToolDefinition<typeof inputSchema> = {
  name: "add_rank_radar_search_terms",
  title: "Add Search Terms to a Rank Radar",
  description:
    "Use this to start tracking extra keywords on an existing Rank Radar, instead of creating a new one with " +
    "`create_rank_radar`. New keywords are added to the niche and tracked from now on; any matching keyword " +
    "that was previously paused is resumed. Each newly tracked keyword takes one Daily Tracked Keywords slot, " +
    "and the call fails if the quota is exhausted — check `get_quota` first. Reversible with " +
    "`archive_rank_radar_search_terms`, which frees the slots again, so it needs no `confirm`. Returns " +
    "`originBreakdown` (where each submitted term ended up) and `keywordToRankRadarKeywordIdMap`, whose ids " +
    "are what the archive/resume search-term tools take.",
  inputSchema,
  annotations: { readOnlyHint: false, destructiveHint: true, openWorldHint: false },
  handler: async (args, ctx) => {
    return await httpPost<AddSearchTermsResult>(
      { config: ctx.config, toolName: "add_rank_radar_search_terms" },
      `/v1/niches/rank-radars/${encodeURIComponent(args.rankRadarId)}/search-terms`,
      { searchTerms: args.searchTerms },
    );
  },
};
