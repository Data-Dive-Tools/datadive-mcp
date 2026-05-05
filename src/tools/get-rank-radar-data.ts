import { z } from "zod";
import { httpGet } from "../http/client.js";
import type { RankRadarKeywordList } from "../types/api.js";
import type { ToolDefinition } from "./types.js";

/** yyyy-mm-dd matcher used by both startDate and endDate. */
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

const inputSchema = {
  rankRadarId: z
    .string()
    .uuid()
    .describe("The Rank Radar UUID (from `list_rank_radars`)."),
  startDate: z
    .string()
    .regex(ISO_DATE, "startDate must be in yyyy-mm-dd format")
    .describe("Start date for the ranking data range, yyyy-mm-dd (e.g. 2024-03-26)."),
  endDate: z
    .string()
    .regex(ISO_DATE, "endDate must be in yyyy-mm-dd format")
    .describe("End date for the ranking data range, yyyy-mm-dd (e.g. 2024-04-26). Must be on or after startDate."),
};

export const getRankRadarDataTool: ToolDefinition<typeof inputSchema> = {
  name: "get_rank_radar_data",
  title: "Get Keyword Rankings for a Rank Radar",
  description:
    "Use this to analyze keyword ranking trends over time. Requires startDate and endDate (yyyy-mm-dd). " +
    "Retrieves historical keyword ranking data for the specified Rank Radar within the date range. " +
    "Returns an array of tracked keywords; each has id, keyword, searchVolume, ranks (per-day " +
    "{ date, organicRank, impressionRank }), and any highlight annotations. Use after " +
    "`list_rank_radars` to discover a `rankRadarId`.",
  inputSchema,
  handler: async (args, ctx) => {
    return await httpGet<RankRadarKeywordList>(
      { config: ctx.config, toolName: "get_rank_radar_data" },
      `/v1/niches/rank-radars/${encodeURIComponent(args.rankRadarId)}`,
      { startDate: args.startDate, endDate: args.endDate },
    );
  },
};
