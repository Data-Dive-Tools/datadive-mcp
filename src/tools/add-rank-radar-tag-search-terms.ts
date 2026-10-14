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
    .describe("The tag UUID to attach keywords to (the `id` from `list_rank_radar_tags`)."),
  rankRadarKeywordIds: z
    .array(z.string().uuid())
    .min(1)
    .max(TAG_KEYWORD_IDS_MAX)
    .describe(
      `Rank Radar keyword ids to attach to this tag (1–${TAG_KEYWORD_IDS_MAX} per call, unique). ` +
        "These are the `id` values from `get_rank_radar_data`; all ids must belong to this Rank " +
        "Radar. Safe to repeat: keywords already attached are left unchanged.",
    ),
};

export const addRankRadarTagSearchTermsTool: ToolDefinition<typeof inputSchema> = {
  name: "add_rank_radar_tag_search_terms",
  title: "Attach Search Terms to a Rank Radar Tag",
  description:
    "Use this to tag a batch of keywords on a Rank Radar — the same relation " +
    "`create_rank_radar_tag` writes when `rankRadarKeywordIds` is passed on creation, so this is " +
    "how you keep extending a tag's keyword set over time. Reversible with " +
    "`remove_rank_radar_tag_search_terms`, so no confirmation is required. Idempotent: " +
    "already-attached keywords are left unchanged, so re-sending the same ids after a timeout " +
    `is safe. Up to ${TAG_KEYWORD_IDS_MAX} ids per call — split larger batches into multiple ` +
    "calls. The system \"paused\" tag (reserved colour, written by the quota pauser) is not " +
    "addressable: the API answers 404.",
  inputSchema,
  annotations: { readOnlyHint: false, destructiveHint: true, openWorldHint: false },
  handler: async (args, ctx) => {
    return await httpPost<TagSearchTermsResult>(
      { config: ctx.config, toolName: "add_rank_radar_tag_search_terms" },
      `/v1/niches/rank-radars/${encodeURIComponent(args.rankRadarId)}/tags/${encodeURIComponent(args.tagId)}/search-terms`,
      { rankRadarKeywordIds: args.rankRadarKeywordIds },
    );
  },
};
