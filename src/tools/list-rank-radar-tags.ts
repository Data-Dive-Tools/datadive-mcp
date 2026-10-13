import { z } from "zod";
import { httpGet } from "../http/client.js";
import type { RankRadarTagList } from "../types/api.js";
import type { ToolDefinition } from "./types.js";

/** Mirrors the API's `PaginationParams.MAX_PAGE_SIZE`; a larger value is not honoured there. */
export const LIST_RANK_RADAR_TAGS_MAX_PAGE_SIZE = 50;

const inputSchema = {
  rankRadarId: z
    .string()
    .uuid()
    .describe("The Rank Radar UUID whose tags to list (from `list_rank_radars`)."),
  currentPage: z.number().int().min(1).optional().describe("Page number, 1-indexed. Defaults to 1."),
  pageSize: z
    .number()
    .int()
    .min(1)
    .max(LIST_RANK_RADAR_TAGS_MAX_PAGE_SIZE)
    .optional()
    .describe(`Items per page (max ${LIST_RANK_RADAR_TAGS_MAX_PAGE_SIZE}). Defaults to 20.`),
};

export const listRankRadarTagsTool: ToolDefinition<typeof inputSchema> = {
  name: "list_rank_radar_tags",
  title: "List Tags of a Rank Radar",
  description:
    "Use this to find a `tagId` before calling `update_rank_radar_tag`, `delete_rank_radar_tag`, " +
    "`add_rank_radar_tag_search_terms` or `remove_rank_radar_tag_search_terms`. Returns the user " +
    "tags (\"highlights\") on the specified Rank Radar, ordered by title (case-insensitive, " +
    "ascending). Each row carries `id`, `title`, `color`, `description`, `startAt`, `endAt`, " +
    "`createdAt`, and `keywordCount` — the number of Rank Radar keywords this tag is applied to. " +
    "The system \"paused\" tag (the one the quota pauser writes with a reserved colour) is not " +
    "listed and cannot be addressed from these tools. Supports pagination metadata " +
    "(currentPage, pageSize, total, lastPage, hasNext, hasPrev); a page holds at most " +
    `${LIST_RANK_RADAR_TAGS_MAX_PAGE_SIZE} tags.`,
  inputSchema,
  annotations: { readOnlyHint: true },
  handler: async (args, ctx): Promise<RankRadarTagList> => {
    return await httpGet<RankRadarTagList>(
      { config: ctx.config, toolName: "list_rank_radar_tags" },
      `/v1/niches/rank-radars/${encodeURIComponent(args.rankRadarId)}/tags`,
      {
        currentPage: args.currentPage,
        pageSize: args.pageSize,
      },
    );
  },
};
