import { z } from "zod";
import { httpPost } from "../http/client.js";
import type { ToolDefinition } from "./types.js";

const inputSchema = {
  rankRadarId: z.string().uuid().describe("The Rank Radar UUID the search terms belong to."),
  rankRadarKeywordIds: z
    .array(z.string().uuid())
    .min(1)
    .describe(
      "The Rank Radar keyword ids to resume. These are the `id` values from `get_rank_radar_data`, or the " +
        "values of `keywordToRankRadarKeywordIdMap` returned by `add_rank_radar_search_terms` — not the " +
        "keyword text.",
    ),
};

export const resumeRankRadarSearchTermsTool: ToolDefinition<typeof inputSchema> = {
  name: "resume_rank_radar_search_terms",
  title: "Resume Paused Search Terms of a Rank Radar",
  description:
    "Use this to start tracking keywords again that were paused with `pause_rank_radar_search_terms`. Each " +
    "resumed keyword takes back one Daily Tracked Keywords slot, and the call fails if the quota is " +
    "exhausted — check `get_quota` first. Reversible with `pause_rank_radar_search_terms`, so it needs no " +
    "`confirm`. Takes keyword ids, not keyword text: get them from `get_rank_radar_data`. Safe to repeat: " +
    "already-active terms are left unchanged.",
  inputSchema,
  annotations: { readOnlyHint: false, destructiveHint: true, openWorldHint: false },
  handler: async (args, ctx) => {
    await httpPost<null>(
      { config: ctx.config, toolName: "resume_rank_radar_search_terms" },
      `/v1/niches/rank-radars/${encodeURIComponent(args.rankRadarId)}/search-terms/resume`,
      { rankRadarKeywordIds: args.rankRadarKeywordIds },
    );
    return {
      status: "resumed",
      rankRadarId: args.rankRadarId,
      rankRadarKeywordIds: args.rankRadarKeywordIds,
    };
  },
};
