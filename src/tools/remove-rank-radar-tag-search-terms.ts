import { z } from "zod";
import { httpPost } from "../http/client.js";
import { TAG_KEYWORD_IDS_MAX, type TagSearchTermsResult } from "../types/api.js";
import type { ToolDefinition } from "./types.js";

const inputSchema = {
  rankRadarId: z
    .string()
    .uuid()
    .describe("The Rank Radar UUID the tag belongs to (from `list_rank_radars`)."),
  tagId: z
    .string()
    .uuid()
    .describe("The tag UUID to detach keywords from (the `id` from `list_rank_radar_tags`)."),
  rankRadarKeywordIds: z
    .array(z.string().uuid())
    .min(1)
    .max(TAG_KEYWORD_IDS_MAX)
    .describe(
      `Rank Radar keyword ids to detach from this tag (1–${TAG_KEYWORD_IDS_MAX} per call, unique). ` +
        "These are the `id` values from `get_rank_radar_data`. Safe to repeat: keywords that are " +
        "not currently attached are left unchanged.",
    ),
};

export const removeRankRadarTagSearchTermsTool: ToolDefinition<typeof inputSchema> = {
  name: "remove_rank_radar_tag_search_terms",
  title: "Detach Search Terms from a Rank Radar Tag",
  description:
    "Use this to remove keywords from a tag without deleting the tag itself. The tag keeps its " +
    "title, colour and date window; only the keyword assignments listed are cleared. Reversible " +
    "with `add_rank_radar_tag_search_terms`, so no confirmation is required. Idempotent: ids " +
    "that are not currently attached are left unchanged, so re-sending the same ids after a " +
    `timeout is safe. Up to ${TAG_KEYWORD_IDS_MAX} ids per call — split larger batches into ` +
    "multiple calls. To remove the tag itself, use `delete_rank_radar_tag`. The system " +
    "\"paused\" tag (reserved colour, written by the quota pauser) is not addressable: the API " +
    "answers 404.",
  inputSchema,
  annotations: { readOnlyHint: false, destructiveHint: true, openWorldHint: false },
  handler: async (args, ctx) => {
    return await httpPost<TagSearchTermsResult>(
      { config: ctx.config, toolName: "remove_rank_radar_tag_search_terms" },
      `/v1/niches/rank-radars/${encodeURIComponent(args.rankRadarId)}/tags/${encodeURIComponent(args.tagId)}/search-terms/remove`,
      { rankRadarKeywordIds: args.rankRadarKeywordIds },
    );
  },
};
