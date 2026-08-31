import { z } from "zod";
import { httpGet } from "../http/client.js";
import {
  RANK_RADAR_STATUSES,
  type ApiRankRadarItem,
  type ApiRankRadarList,
  type RankRadarItem,
  type RankRadarList,
} from "../types/api.js";
import type { ToolDefinition } from "./types.js";

/** Mirrors the API's `PaginationParams.MAX_PAGE_SIZE`; a larger value is not honoured there. */
export const LIST_RANK_RADARS_MAX_PAGE_SIZE = 50;

const inputSchema = {
  currentPage: z.number().int().min(1).optional().describe("Page number, 1-indexed. Defaults to 1."),
  pageSize: z
    .number()
    .int()
    .min(1)
    .max(LIST_RANK_RADARS_MAX_PAGE_SIZE)
    .optional()
    .describe(`Items per page (max ${LIST_RANK_RADARS_MAX_PAGE_SIZE}). Defaults to 20.`),
  nicheId: z
    .string()
    .min(1)
    .optional()
    .describe("Filter Rank Radars by Niche identifier. Use after `list_niches`."),
  status: z
    .enum(RANK_RADAR_STATUSES)
    .optional()
    .describe(
      "Which Rank Radars to return. ACTIVE (the default) are tracking; PAUSED have been stopped " +
        "but keep their history and can be resumed; ARCHIVED have been deleted; ALL means active " +
        "and paused together. Archived Rank Radars are returned only by an explicit ARCHIVED.",
    ),
  searchText: z.string().optional().describe("Filter Rank Radars by ASIN or product title."),
};

/**
 * Drops the `krt_asin` row's internal identifiers and keeps the ASIN itself. The API sends
 * `asin: { id, krtId, asin }`, where `id` is an internal row id and `krtId` repeats the item's own
 * `id`; neither is accepted by any tool, so both are noise in the model's context.
 */
function minimize(item: ApiRankRadarItem): RankRadarItem {
  const { asin, ...rest } = item;

  return { ...rest, asin: asin?.asin };
}

export const listRankRadarsTool: ToolDefinition<typeof inputSchema> = {
  name: "list_rank_radars",
  title: "List Rank Radars",
  description:
    "Use this to find a `rankRadarId` before calling `get_rank_radar_data`. Filter by `nicheId` " +
    "if the user has already identified a niche. " +
    "Retrieves a paginated list of Rank Radars — keyword-rank trackers monitoring organic and " +
    "sponsored positions for specific ASINs over time. Each item includes id, status (ACTIVE, " +
    "PAUSED or ARCHIVED), asin, marketplace, keywordCount, title, imageUrl, and summary metrics: " +
    "top10KW, top10SV, top50KW, top50SV. Supports pagination metadata (currentPage, pageSize, " +
    `total, lastPage, hasNext, hasPrev); a page holds at most ${LIST_RANK_RADARS_MAX_PAGE_SIZE} ` +
    "Rank Radars, so a large account needs several calls.",
  inputSchema,
  annotations: { readOnlyHint: true },
  handler: async (args, ctx): Promise<RankRadarList> => {
    const page = await httpGet<ApiRankRadarList>(
      { config: ctx.config, toolName: "list_rank_radars" },
      "/v1/niches/rank-radars",
      {
        currentPage: args.currentPage,
        pageSize: args.pageSize,
        nicheId: args.nicheId,
        status: args.status,
        searchText: args.searchText,
      },
    );

    return { ...page, data: (page.data ?? []).map(minimize) };
  },
};
