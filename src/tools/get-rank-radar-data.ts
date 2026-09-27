import { httpGet } from "../http/client.js";
import type { RankRadarKeywordList } from "../types/api.js";
import {
  RANK_RADAR_KEYWORD_PAGING_NOTE,
  RANK_RADAR_MAX_DATE_RANGE_DAYS,
  rankRadarKeywordQuery,
  rankRadarKeywordQueryInputSchema,
  rankRadarPath,
} from "./rank-radar-keyword-query.js";
import type { ToolDefinition } from "./types.js";

export {
  RANK_RADAR_KEYWORDS_MAX_PAGE_SIZE,
  RANK_RADAR_MAX_DATE_RANGE_DAYS,
} from "./rank-radar-keyword-query.js";

const inputSchema = rankRadarKeywordQueryInputSchema;

export const getRankRadarDataTool: ToolDefinition<typeof inputSchema> = {
  name: "get_rank_radar_data",
  title: "Get Keyword Rankings for a Rank Radar",
  description:
    "Use this to analyze keyword ranking trends over time. Requires startDate and endDate (yyyy-mm-dd), " +
    `at most ${RANK_RADAR_MAX_DATE_RANGE_DAYS} days apart. ` +
    "Retrieves historical keyword ranking data for the specified Rank Radar within the date range. " +
    `${RANK_RADAR_KEYWORD_PAGING_NOTE} Each keyword has id, keyword, searchVolume, relevancy, ranks (per-day ` +
    "{ date, organicRank, sponsoredRank, impressionRank }), and any highlight annotations. A rank of 101 means " +
    "the product was not in the top 100 results that day. For PPC metrics use `get_rank_radar_ppc_data`; for Search Query Performance use `get_rank_radar_sqp_data`. Use after " +
    "`list_rank_radars` to discover a `rankRadarId`.",
  inputSchema,
  annotations: { readOnlyHint: true },
  handler: async (args, ctx) => {
    return await httpGet<RankRadarKeywordList>(
      { config: ctx.config, toolName: "get_rank_radar_data" },
      rankRadarPath(args.rankRadarId),
      rankRadarKeywordQuery(args),
    );
  },
};
