import { httpGet } from "../http/client.js";
import type { KrtKeyword, RankRadarKeywordList } from "../types/api.js";
import {
  RANK_RADAR_KEYWORDS_MAX_PAGE_SIZE,
  RANK_RADAR_MAX_DATE_RANGE_DAYS,
  rankRadarKeywordQuery,
  rankRadarKeywordQueryInputSchema,
  rankRadarPath,
} from "./rank-radar-keyword-query.js";
import type { HandlerContext, ToolDefinition } from "./types.js";

export {
  RANK_RADAR_KEYWORDS_MAX_PAGE_SIZE,
  RANK_RADAR_MAX_DATE_RANGE_DAYS,
} from "./rank-radar-keyword-query.js";

const inputSchema = rankRadarKeywordQueryInputSchema;

type DateRange = { rankRadarId: string; startDate: string; endDate: string };

/**
 * Reads every active keyword of a Rank Radar, one bounded API page at a time (RS-11791).
 *
 * This is what a call without `currentPage` / `pageSize` gets. Those inputs arrived after the API
 * started paging (RS-11683), and MCP clients keep the tool list they fetched when they connected —
 * ChatGPT, claude.ai and Claude Code were all seen still offering the three original inputs days
 * later, with no protocol message that makes them reload it. Such a client can never ask for page 2,
 * so without this it would silently see only the API's default first 20 keywords. Reading the pages
 * here keeps the tool's original contract — every keyword — for those clients, while each request
 * stays a normal, bounded page for the backend.
 *
 * Pages are read in order, not in parallel, so one tool call never puts more than one keyword page
 * on the backend at a time.
 */
async function readAllKeywords(args: DateRange, ctx: HandlerContext): Promise<RankRadarKeywordList> {
  const request = { config: ctx.config, toolName: "get_rank_radar_data" };
  const path = rankRadarPath(args.rankRadarId);
  const keywords: KrtKeyword[] = [];
  let page: RankRadarKeywordList;
  let currentPage = 1;

  do {
    page = await httpGet<RankRadarKeywordList>(
      request,
      path,
      rankRadarKeywordQuery({ ...args, currentPage, pageSize: RANK_RADAR_KEYWORDS_MAX_PAGE_SIZE }),
    );
    keywords.push(...(page.data ?? []));
    currentPage++;
    // `lastPage` and an empty page both end the walk, so an API that stopped honouring
    // `currentPage` could not turn this into an endless loop.
  } while (page.hasNext && currentPage <= page.lastPage && (page.data?.length ?? 0) > 0);

  return {
    data: keywords,
    currentPage: 1,
    pageSize: keywords.length,
    total: page.total,
    lastPage: 1,
    hasNext: false,
    hasPrev: false,
  };
}

export const getRankRadarDataTool: ToolDefinition<typeof inputSchema> = {
  name: "get_rank_radar_data",
  title: "Get Keyword Rankings for a Rank Radar",
  description:
    "Use this to analyze keyword ranking trends over time. Requires startDate and endDate (yyyy-mm-dd), " +
    `at most ${RANK_RADAR_MAX_DATE_RANGE_DAYS} days apart. ` +
    "Retrieves historical keyword ranking data for the specified Rank Radar within the date range. " +
    "Without `currentPage` and `pageSize` it returns every active keyword in one result. To read one page " +
    `instead — faster for large Rank Radars — pass \`currentPage\` and/or \`pageSize\` (max ${RANK_RADAR_KEYWORDS_MAX_PAGE_SIZE}) ` +
    "and continue with `currentPage` + 1 while `hasNext` is true. The response carries currentPage, pageSize, " +
    "total, lastPage, hasNext and hasPrev; `total` is the Rank Radar's active keyword count. Paused keywords " +
    "are not included. Each keyword has id, keyword, searchVolume, relevancy, ranks (per-day " +
    "{ date, organicRank, sponsoredRank, impressionRank }), and any highlight annotations. A rank of 101 means " +
    "the product was not in the top 100 results that day. For PPC metrics use `get_rank_radar_ppc_data`; for " +
    "Search Query Performance use `get_rank_radar_sqp_data`. Use after `list_rank_radars` to discover a " +
    "`rankRadarId`.",
  inputSchema,
  annotations: { readOnlyHint: true },
  handler: async (args, ctx) => {
    if (args.currentPage === undefined && args.pageSize === undefined) {
      return await readAllKeywords(args, ctx);
    }

    return await httpGet<RankRadarKeywordList>(
      { config: ctx.config, toolName: "get_rank_radar_data" },
      rankRadarPath(args.rankRadarId),
      rankRadarKeywordQuery(args),
    );
  },
};
