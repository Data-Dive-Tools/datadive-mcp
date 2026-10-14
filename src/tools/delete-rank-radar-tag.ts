import { z } from "zod";
import { httpDelete } from "../http/client.js";
import { requireConfirmation } from "./confirm.js";
import type { ToolDefinition } from "./types.js";

const inputSchema = {
  rankRadarId: z
    .string()
    .uuid()
    .describe("The Rank Radar UUID the tag belongs to (from `list_rank_radars`)."),
  tagId: z
    .string()
    .uuid()
    .describe("The tag UUID to delete (the `id` from `list_rank_radar_tags`)."),
  confirm: z
    .boolean()
    .optional()
    .describe(
      "Must be true to proceed. Confirm with the user first — the tag's keyword assignments are " +
        "removed too and the tag cannot be recovered.",
    ),
};

export const deleteRankRadarTagTool: ToolDefinition<typeof inputSchema> = {
  name: "delete_rank_radar_tag",
  title: "Delete a Rank Radar Tag",
  description:
    "Use this to permanently remove a tag from a Rank Radar. ⚠️ The tag itself is gone and the " +
    "assignments linking it to each tagged keyword are removed with it; the keywords themselves " +
    "keep tracking. The deletion cannot be undone from this tool, so set `confirm: true` only " +
    "after the user approves. The system \"paused\" tag (reserved colour, written by the quota " +
    "pauser) cannot be addressed from here — the API answers 404. To remove just the assignments " +
    "and keep the tag, use `remove_rank_radar_tag_search_terms` instead.",
  inputSchema,
  annotations: { readOnlyHint: false, destructiveHint: true, openWorldHint: false },
  handler: async (args, ctx) => {
    const pending = requireConfirmation(
      args.confirm,
      ctx,
      "Deleting this tag removes it from every keyword it was applied to. The tag cannot be " +
        "recovered — if the user only wants to clear its keyword list, use " +
        "`remove_rank_radar_tag_search_terms`.",
    );
    if (pending) return pending;

    await httpDelete<null>(
      { config: ctx.config, toolName: "delete_rank_radar_tag" },
      `/v1/niches/rank-radars/${encodeURIComponent(args.rankRadarId)}/tags/${encodeURIComponent(args.tagId)}`,
    );
    return { status: "deleted", rankRadarId: args.rankRadarId, tagId: args.tagId };
  },
};
