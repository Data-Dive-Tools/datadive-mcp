import { z } from "zod";
import { httpPost } from "../http/client.js";
import {
  RankRadarTag,
  TAG_HEX_COLOR_PATTERN,
  TAG_KEYWORD_IDS_MAX,
  TAG_RESERVED_COLOR,
  TAG_TITLE_MAX_LENGTH,
} from "../types/api.js";
import type { ToolDefinition } from "./types.js";

const inputSchema = {
  rankRadarId: z
    .string()
    .uuid()
    .describe("The Rank Radar UUID to create the tag on (from `list_rank_radars`)."),
  title: z
    .string()
    .min(1)
    .max(TAG_TITLE_MAX_LENGTH)
    .describe(
      `Display title (1–${TAG_TITLE_MAX_LENGTH} characters, trimmed on write). Must be unique on ` +
        "this Rank Radar, case-insensitive. A clash returns 409 with " +
        "`{ error: 'TAG_TITLE_EXISTS', existingTagId }` — reuse that id instead of retrying.",
    ),
  color: z
    .string()
    .regex(TAG_HEX_COLOR_PATTERN, "color must be in #RRGGBB form")
    .optional()
    .describe(
      "Hex colour in `#RRGGBB` form. Defaults to the UI grey when omitted. The reserved colour " +
        `\`${TAG_RESERVED_COLOR}\` (used by the system "paused" tag) is rejected with 400.`,
    ),
  description: z.string().optional().describe("Free-form description, e.g. 'Prime Day run-up'."),
  startAt: z
    .string()
    .optional()
    .describe("ISO 8601 start date, e.g. '2026-07-01'. Required if `endAt` is set; `endAt >= startAt`."),
  endAt: z
    .string()
    .optional()
    .describe("ISO 8601 end date, e.g. '2026-07-14'. Must be greater than or equal to `startAt`."),
  rankRadarKeywordIds: z
    .array(z.string().uuid())
    .min(1)
    .max(TAG_KEYWORD_IDS_MAX)
    .optional()
    .describe(
      `Optional: Rank Radar keyword ids to tag on creation (1–${TAG_KEYWORD_IDS_MAX}). These are ` +
        "the `id` values from `get_rank_radar_data`; the ids must all belong to this Rank Radar. " +
        "To attach more later, use `add_rank_radar_tag_search_terms`.",
    ),
};

export const createRankRadarTagTool: ToolDefinition<typeof inputSchema> = {
  name: "create_rank_radar_tag",
  title: "Create a Rank Radar Tag",
  description:
    "Use this to create a new user tag (\"highlight\") on a Rank Radar — the way the UI marks a " +
    "window on the ranking chart. Writing a tag costs nothing and is reversible with " +
    "`delete_rank_radar_tag`, so no confirmation is required. Returns the new tag row " +
    "(`id`, `title`, `color`, `description`, `startAt`, `endAt`, `keywordCount`, `createdAt`); " +
    "the `id` is the `tagId` the other tag tools take. If the title clashes with an existing tag " +
    "on this Rank Radar, the API answers 409 `{ error: 'TAG_TITLE_EXISTS', existingTagId }` so " +
    "callers can reuse the existing tag without a follow-up `list_rank_radar_tags`. The reserved " +
    `colour \`${TAG_RESERVED_COLOR}\` is rejected with 400. Pass \`rankRadarKeywordIds\` to tag ` +
    "a batch of keywords in the same call; otherwise create the tag and attach keywords later " +
    "with `add_rank_radar_tag_search_terms`.",
  inputSchema,
  annotations: { readOnlyHint: false, destructiveHint: true, openWorldHint: false },
  handler: async (args, ctx) => {
    const body: Record<string, unknown> = { title: args.title };
    if (args.color !== undefined) body.color = args.color;
    if (args.description !== undefined) body.description = args.description;
    if (args.startAt !== undefined) body.startAt = args.startAt;
    if (args.endAt !== undefined) body.endAt = args.endAt;
    if (args.rankRadarKeywordIds !== undefined) body.rankRadarKeywordIds = args.rankRadarKeywordIds;

    return await httpPost<RankRadarTag>(
      { config: ctx.config, toolName: "create_rank_radar_tag" },
      `/v1/niches/rank-radars/${encodeURIComponent(args.rankRadarId)}/tags`,
      body,
    );
  },
};
