import { httpGet } from "../http/client.js";
import type { RankRadarSqpKeywordList } from "../types/api.js";
import {
  RANK_RADAR_KEYWORD_PAGING_NOTE,
  RANK_RADAR_MAX_DATE_RANGE_DAYS,
  rankRadarKeywordQuery,
  rankRadarKeywordQueryInputSchema,
  rankRadarPath,
} from "./rank-radar-keyword-query.js";
import type { ToolDefinition } from "./types.js";

const inputSchema = rankRadarKeywordQueryInputSchema;

export const getRankRadarSqpDataTool: ToolDefinition<typeof inputSchema> = {
  name: "get_rank_radar_sqp_data",
  title: "Get Search Query Performance for a Rank Radar",
  description:
    "Use this when the user asks how shoppers search, click, add to cart and buy for the keywords of a Rank " +
    "Radar — Amazon's Search Query Performance (SQP) data, from Brand Analytics. Requires startDate and " +
    `endDate (yyyy-mm-dd), at most ${RANK_RADAR_MAX_DATE_RANGE_DAYS} days apart; 30 days or less keeps it ` +
    "fast. Each keyword's metrics are aggregated over the range: searchQueryVolume and searchQueryScore; " +
    "impressions, clicks, cart adds and purchases, each as the total across all sellers (`*TotalCount`), " +
    "this ASIN family's count (`*AsinCount`) and its share (`*AsinShare`); click, cart-add and purchase " +
    "rates; and ctr/cvr for the market (`*Total`) and for this ASIN family (`*Asin`). `numberOfDaysWithData` " +
    "says how many days of the range had SQP data; metrics are null when there is none, which is normal " +
    "for low-volume keywords, recent dates (Amazon publishes SQP with a delay) and sellers without Brand " +
    `Analytics. ${RANK_RADAR_KEYWORD_PAGING_NOTE} Each call counts toward API usage and is rate limited ` +
    "(about 60 requests/minute). Use after `list_rank_radars` to discover a `rankRadarId`.",
  inputSchema,
  annotations: { readOnlyHint: true },
  handler: async (args, ctx) => {
    return await httpGet<RankRadarSqpKeywordList>(
      { config: ctx.config, toolName: "get_rank_radar_sqp_data" },
      rankRadarPath(args.rankRadarId, "sqp"),
      rankRadarKeywordQuery(args),
    );
  },
};
