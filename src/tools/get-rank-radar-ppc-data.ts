import { z } from "zod";
import { httpGet } from "../http/client.js";
import type { RankRadarPpcKeywordList } from "../types/api.js";
import {
  RANK_RADAR_KEYWORD_PAGING_NOTE,
  RANK_RADAR_MAX_DATE_RANGE_DAYS,
  rankRadarKeywordQuery,
  rankRadarKeywordQueryInputSchema,
  rankRadarPath,
} from "./rank-radar-keyword-query.js";
import type { ToolDefinition } from "./types.js";

const inputSchema = {
  ...rankRadarKeywordQueryInputSchema,
  includeCampaigns: z
    .boolean()
    .optional()
    .describe(
      "When true, each keyword also carries `campaigns`: the per-campaign/ad-group breakdown (campaign and " +
        "ad group name, match type, targeting, spend, sales, clicks, impressions, orders, CPC, CTR, CVR, ACOS). " +
        "Defaults to false; leave it off unless the user asks which campaigns drive a keyword.",
    ),
};

export const getRankRadarPpcDataTool: ToolDefinition<typeof inputSchema> = {
  name: "get_rank_radar_ppc_data",
  title: "Get PPC Data for a Rank Radar",
  description:
    "Use this when the user asks about advertising (Sponsored Products) performance for the keywords of a " +
    "Rank Radar. Requires startDate and endDate (yyyy-mm-dd), at most " +
    `${RANK_RADAR_MAX_DATE_RANGE_DAYS} days apart; 30 days or less keeps it fast. Each keyword's metrics are ` +
    "aggregated over the range: sponsoredRank (median; 101 means not in the top 100 sponsored results), " +
    "impressionRank and impressionRankShare; how many exact, phrase, broad and auto campaigns target it; " +
    "organicSales, ppcSales, ppcSpend, costPerClicks, clickThroughRate, conversionRate, totalClicks, " +
    "totalImpressions, totalOrders and acos. Metrics are null or 0 when the seller runs no ads on a keyword. Set " +
    `\`includeCampaigns\` for the per-campaign breakdown. ${RANK_RADAR_KEYWORD_PAGING_NOTE} Each call counts ` +
    "toward API usage and is rate limited (about 60 requests/minute). For the seller's campaigns as a " +
    "whole, use `list_ppc_campaigns`. Use after `list_rank_radars` to discover a `rankRadarId`.",
  inputSchema,
  annotations: { readOnlyHint: true },
  handler: async (args, ctx) => {
    return await httpGet<RankRadarPpcKeywordList>(
      { config: ctx.config, toolName: "get_rank_radar_ppc_data" },
      rankRadarPath(args.rankRadarId, "ppc"),
      { ...rankRadarKeywordQuery(args), includeCampaigns: args.includeCampaigns },
    );
  },
};
