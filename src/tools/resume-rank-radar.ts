import { z } from "zod";
import { httpPost } from "../http/client.js";
import type { ToolDefinition } from "./types.js";

const inputSchema = {
  rankRadarId: z.string().uuid().describe("The Rank Radar UUID to resume (from `list_rank_radars`)."),
};

export const resumeRankRadarTool: ToolDefinition<typeof inputSchema> = {
  name: "resume_rank_radar",
  title: "Resume a Paused Rank Radar",
  description:
    "Use this to restart tracking on a Rank Radar that was paused with `pause_rank_radar` (shown by " +
    "`list_rank_radars` under `status: PAUSED`; a deleted, `ARCHIVED` one cannot be resumed). Keywords are " +
    "resumed as far as the available Daily Tracked Keywords quota allows, most relevant first — so with a " +
    "tight quota only part of the original keyword set comes back; check `get_quota` first if that matters. " +
    "Reversible with `pause_rank_radar`, so it needs no `confirm`. Fails with a bad-request error when " +
    "there is no quota left at all. Safe to repeat: resuming an already active Rank Radar changes nothing.",
  inputSchema,
  annotations: { readOnlyHint: false, destructiveHint: true, openWorldHint: false },
  handler: async (args, ctx) => {
    await httpPost<null>(
      { config: ctx.config, toolName: "resume_rank_radar" },
      `/v1/niches/rank-radars/${encodeURIComponent(args.rankRadarId)}/resume`,
      {},
    );
    return { status: "resumed", rankRadarId: args.rankRadarId };
  },
};
