import { z } from "zod";
import { httpPost } from "../http/client.js";
import type { ToolDefinition } from "./types.js";

const inputSchema = {
  rankRadarId: z.string().uuid().describe("The Rank Radar UUID to archive (from `list_rank_radars`)."),
};

export const archiveRankRadarTool: ToolDefinition<typeof inputSchema> = {
  name: "archive_rank_radar",
  title: "Archive (Pause) a Rank Radar",
  description:
    "Use this to pause tracking on a Rank Radar without losing anything. Tracking stops for all of its " +
    "keywords and the Daily Tracked Keywords quota they held is freed for other Rank Radars, while the Rank " +
    "Radar and its ranking history are kept. Fully reversible with `resume_rank_radar`, so it needs no " +
    "`confirm` — prefer it over `delete_rank_radar` whenever the user may want the data back. Archived Rank " +
    "Radars show up in `list_rank_radars` under `status: PAUSED`. Safe to repeat: archiving an already " +
    "archived Rank Radar succeeds and changes nothing.",
  inputSchema,
  annotations: { readOnlyHint: false, destructiveHint: true, openWorldHint: false },
  handler: async (args, ctx) => {
    // 204 No Content — return an explicit result rather than the `null` body.
    await httpPost<null>(
      { config: ctx.config, toolName: "archive_rank_radar" },
      `/v1/niches/rank-radars/${encodeURIComponent(args.rankRadarId)}/archive`,
      {},
    );
    return { status: "archived", rankRadarId: args.rankRadarId };
  },
};
