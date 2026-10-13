import { z } from "zod";
import { httpPatch } from "../http/client.js";
import {
  RankRadarTag,
  TAG_HEX_COLOR_PATTERN,
  TAG_RESERVED_COLOR,
  TAG_TITLE_MAX_LENGTH,
} from "../types/api.js";
import type { ToolDefinition } from "./types.js";

const inputSchema = {
  rankRadarId: z
    .string()
    .uuid()
    .describe("The Rank Radar UUID the tag belongs to (from `list_rank_radars`)."),
  tagId: z
    .string()
    .uuid()
    .describe("The tag UUID to update (the `id` from `list_rank_radar_tags` or `create_rank_radar_tag`)."),
  title: z
    .string()
    .min(1)
    .max(TAG_TITLE_MAX_LENGTH)
    .optional()
    .describe(
      `New title (1–${TAG_TITLE_MAX_LENGTH} characters, trimmed on write). Must be unique on this ` +
        "Rank Radar, case-insensitive. A clash returns 409 with " +
        "`{ error: 'TAG_TITLE_EXISTS', existingTagId }`.",
    ),
  color: z
    .string()
    .regex(TAG_HEX_COLOR_PATTERN, "color must be in #RRGGBB form")
    .optional()
    .describe(`Hex colour in \`#RRGGBB\` form. The reserved colour \`${TAG_RESERVED_COLOR}\` is rejected with 400.`),
  description: z
    .string()
    .optional()
    .describe("Free-form description. Pass an empty string to clear."),
  startAt: z
    .string()
    .optional()
    .describe("ISO 8601 start date, e.g. '2026-07-01'. `endAt >= startAt`."),
  endAt: z.string().optional().describe("ISO 8601 end date, e.g. '2026-07-14'. `endAt >= startAt`."),
};

export const updateRankRadarTagTool: ToolDefinition<typeof inputSchema> = {
  name: "update_rank_radar_tag",
  title: "Update a Rank Radar Tag",
  description:
    "Use this to change a tag's title, colour, description, or date window. Partial update: " +
    "only the fields you pass are modified, the rest are left as they are. The system " +
    "\"paused\" tag (reserved colour, written by the quota pauser) cannot be addressed from " +
    "here — the API answers 404. Writing a tag costs nothing and is reversible, so no " +
    "confirmation is required. Returns the updated tag row. Title clashes return 409 " +
    "`{ error: 'TAG_TITLE_EXISTS', existingTagId }`; the reserved colour returns 400; and " +
    "`endAt < startAt` returns 400 (for whichever side the body omits, the comparison uses the " +
    "stored value).",
  inputSchema,
  annotations: { readOnlyHint: false, destructiveHint: true, openWorldHint: false },
  handler: async (args, ctx) => {
    const body: Record<string, unknown> = {};
    if (args.title !== undefined) body.title = args.title;
    if (args.color !== undefined) body.color = args.color;
    if (args.description !== undefined) body.description = args.description;
    if (args.startAt !== undefined) body.startAt = args.startAt;
    if (args.endAt !== undefined) body.endAt = args.endAt;

    return await httpPatch<RankRadarTag>(
      { config: ctx.config, toolName: "update_rank_radar_tag" },
      `/v1/niches/rank-radars/${encodeURIComponent(args.rankRadarId)}/tags/${encodeURIComponent(args.tagId)}`,
      body,
    );
  },
};
