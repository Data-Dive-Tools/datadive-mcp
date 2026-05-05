import { z } from "zod";
import { httpGet } from "../http/client.js";
import { RANK_RADAR_STATUSES, type RankRadarList } from "../types/api.js";
import type { ToolDefinition } from "./types.js";

const inputSchema = {
  currentPage: z.number().int().min(1).optional().describe("Page number, 1-indexed. Defaults to 1."),
  pageSize: z
    .number()
    .int()
    .min(1)
    .max(100)
    .optional()
    .describe("Items per page (max 100). Defaults to 20."),
  nicheId: z
    .string()
    .min(1)
    .optional()
    .describe("Filter Rank Radars by Niche identifier. Use after `list_niches`."),
  status: z
    .enum(RANK_RADAR_STATUSES)
    .optional()
    .describe(
      "Filter by Rank Radar status. By default, returns only ACTIVE Rank Radars. Allowed: ACTIVE, PAUSED, ARCHIVED.",
    ),
  searchText: z.string().optional().describe("Filter Rank Radars by ASIN or product title."),
};

export const listRankRadarsTool: ToolDefinition<typeof inputSchema> = {
  name: "list_rank_radars",
  title: "List Rank Radars",
  description:
    "Use this to find a `rankRadarId` before calling `get_rank_radar_data`. Filter by `nicheId` " +
    "if the user has already identified a niche. " +
    "Retrieves a paginated list of Rank Radars — keyword-rank trackers monitoring organic and " +
    "sponsored positions for specific ASINs over time. Each item includes id, asin (with id, krtId, " +
    "asin), marketplace, keywordCount, title, imageUrl, and summary metrics: top10KW, top10SV, " +
    "top50KW, top50SV. Supports pagination metadata (currentPage, pageSize, total, lastPage, " +
    "hasNext, hasPrev).",
  inputSchema,
  handler: async (args, ctx) => {
    return await httpGet<RankRadarList>(
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
  },
};
