import { z } from "zod";
import { httpPost } from "../http/client.js";
import type { ToolDefinition } from "./types.js";

const inputSchema = {
  rankRadarId: z.string().uuid().describe("The Rank Radar UUID to pause (from `list_rank_radars`)."),
};

export const pauseRankRadarTool: ToolDefinition<typeof inputSchema> = {
  name: "pause_rank_radar",
  title: "Pause a Rank Radar",
  description:
    "Use this to pause tracking on a Rank Radar without losing anything — the action the DataDive API calls " +
    "'archiving', so when a user asks to archive a Rank Radar, this is the tool they mean. Tracking stops for " +
    "all of its keywords and the Daily Tracked Keywords quota they held is freed for other Rank Radars, while " +
    "the Rank Radar and its ranking history are kept. Fully reversible with `resume_rank_radar`, so it needs " +
    "no `confirm` — prefer it over `delete_rank_radar` whenever the user may want the data back. Paused Rank " +
    "Radars show up in `list_rank_radars` under `status: PAUSED` — not `ARCHIVED`, which covers Rank Radars " +
    "removed with `delete_rank_radar`. Safe to repeat: pausing an already paused Rank Radar succeeds and " +
    "changes nothing.",
  inputSchema,
  annotations: { readOnlyHint: false, destructiveHint: true, openWorldHint: false },
  handler: async (args, ctx) => {
    // 204 No Content — return an explicit result rather than the `null` body.
    await httpPost<null>(
      { config: ctx.config, toolName: "pause_rank_radar" },
      `/v1/niches/rank-radars/${encodeURIComponent(args.rankRadarId)}/archive`,
      {},
    );
    return { status: "paused", rankRadarId: args.rankRadarId };
  },
};
