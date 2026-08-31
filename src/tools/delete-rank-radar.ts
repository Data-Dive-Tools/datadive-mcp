import { z } from "zod";
import { httpDelete } from "../http/client.js";
import { requireConfirmation } from "./confirm.js";
import type { ToolDefinition } from "./types.js";

const inputSchema = {
  rankRadarId: z.string().uuid().describe("The Rank Radar UUID to delete (from `list_rank_radars`)."),
  confirm: z
    .boolean()
    .optional()
    .describe(
      "Must be true to proceed — deleting a Rank Radar destroys its ranking history permanently. " +
        "Confirm with the user first.",
    ),
};

export const deleteRankRadarTool: ToolDefinition<typeof inputSchema> = {
  name: "delete_rank_radar",
  title: "Delete a Rank Radar",
  description:
    "Use this to permanently remove a Rank Radar and all of its keyword ranking history. ⚠️ Cannot be undone " +
    "— there is no restore endpoint; set `confirm: true` only after the user approves. It does free the Daily " +
    "Tracked Keywords quota those keywords held. Deleted Rank Radars are what `list_rank_radars` returns for " +
    "`status: ARCHIVED`. If the user only wants to stop tracking for a while and keep the history, use " +
    "`archive_rank_radar` instead: it frees the same quota and is reversible with `resume_rank_radar`.",
  inputSchema,
  annotations: { readOnlyHint: false, destructiveHint: true, openWorldHint: false },
  handler: async (args, ctx) => {
    const pending = requireConfirmation(
      args.confirm,
      ctx,
      "Deleting this Rank Radar removes its keyword ranking history permanently. It frees the Daily " +
        "Tracked Keywords quota, but the history cannot be recovered — `archive_rank_radar` frees the " +
        "same quota and is reversible.",
    );
    if (pending) return pending;

    await httpDelete<null>(
      { config: ctx.config, toolName: "delete_rank_radar" },
      `/v1/niches/rank-radars/${encodeURIComponent(args.rankRadarId)}`,
    );
    return { status: "deleted", rankRadarId: args.rankRadarId };
  },
};
