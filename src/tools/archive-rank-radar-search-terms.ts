import { z } from "zod";
import { httpPost } from "../http/client.js";
import type { ToolDefinition } from "./types.js";

const inputSchema = {
  rankRadarId: z.string().uuid().describe("The Rank Radar UUID the search terms belong to."),
  rankRadarKeywordIds: z
    .array(z.string().uuid())
    .min(1)
    .describe(
      "The Rank Radar keyword ids to pause. These are the `id` values from `get_rank_radar_data`, or the " +
        "values of `keywordToRankRadarKeywordIdMap` returned by `add_rank_radar_search_terms` — not the " +
        "keyword text.",
    ),
};

export const archiveRankRadarSearchTermsTool: ToolDefinition<typeof inputSchema> = {
  name: "archive_rank_radar_search_terms",
  title: "Archive (Pause) Search Terms of a Rank Radar",
  description:
    "Use this to stop tracking individual keywords on a Rank Radar while keeping the Rank Radar itself " +
    "active — the way to trim a keyword set the user finds too broad. The paused keywords keep their history " +
    "and their Daily Tracked Keywords slots are freed for other keywords. Reversible with " +
    "`resume_rank_radar_search_terms`, so it needs no `confirm`. Takes keyword ids, not keyword text: get " +
    "them from `get_rank_radar_data`. Safe to repeat: already-archived terms are left unchanged.",
  inputSchema,
  annotations: { readOnlyHint: false, destructiveHint: true, openWorldHint: false },
  handler: async (args, ctx) => {
    // 204 No Content — return an explicit result rather than the `null` body.
    await httpPost<null>(
      { config: ctx.config, toolName: "archive_rank_radar_search_terms" },
      `/v1/niches/rank-radars/${encodeURIComponent(args.rankRadarId)}/search-terms/archive`,
      { rankRadarKeywordIds: args.rankRadarKeywordIds },
    );
    return {
      status: "archived",
      rankRadarId: args.rankRadarId,
      rankRadarKeywordIds: args.rankRadarKeywordIds,
    };
  },
};
