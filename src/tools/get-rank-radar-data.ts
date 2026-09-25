import { z } from "zod";
import { httpGet } from "../http/client.js";
import type { RankRadarKeywordList } from "../types/api.js";
import type { ToolDefinition } from "./types.js";

/** yyyy-mm-dd matcher used by both startDate and endDate. */
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Mirrors the API's `RANK_RADAR_KEYWORD_LIST_MAX_PAGE_SIZE`. A larger value is not rejected there:
 * it silently falls back to the default page of 20, so the cap has to be enforced here.
 */
export const RANK_RADAR_KEYWORDS_MAX_PAGE_SIZE = 100;

/** Mirrors the API's `MAX_DATE_RANGE_DAYS`; a longer range is refused with a 400. */
export const RANK_RADAR_MAX_DATE_RANGE_DAYS = 90;

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
    .describe(
      "End date for the ranking data range, yyyy-mm-dd (e.g. 2024-04-26). Must be on or after startDate, " +
        `and at most ${RANK_RADAR_MAX_DATE_RANGE_DAYS} days after it.`,
    ),
  currentPage: z.number().int().min(1).optional().describe("Page of keywords, 1-indexed. Defaults to 1."),
  pageSize: z
    .number()
    .int()
    .min(1)
    .max(RANK_RADAR_KEYWORDS_MAX_PAGE_SIZE)
    .optional()
    .describe(`Keywords per page (max ${RANK_RADAR_KEYWORDS_MAX_PAGE_SIZE}). Defaults to 20.`),
};

export const getRankRadarDataTool: ToolDefinition<typeof inputSchema> = {
  name: "get_rank_radar_data",
  title: "Get Keyword Rankings for a Rank Radar",
  description:
    "Use this to analyze keyword ranking trends over time. Requires startDate and endDate (yyyy-mm-dd), " +
    `at most ${RANK_RADAR_MAX_DATE_RANGE_DAYS} days apart. ` +
    "Retrieves historical keyword ranking data for the specified Rank Radar within the date range. " +
    "Results are paged by keyword: `data` holds one page of tracked keywords, and the response carries " +
    "currentPage, pageSize, total, lastPage, hasNext and hasPrev. `total` is the Rank Radar's keyword count; " +
    "to read every keyword, call again with `currentPage` + 1 while `hasNext` is true, using " +
    `\`pageSize\` ${RANK_RADAR_KEYWORDS_MAX_PAGE_SIZE} for large Rank Radars. Each keyword has id, keyword, ` +
    "searchVolume, relevancy, ranks (per-day { date, organicRank, sponsoredRank, impressionRank }), and any " +
    "highlight annotations. Paused keywords are not included. Use after `list_rank_radars` to discover a " +
    "`rankRadarId`.",
  inputSchema,
  annotations: { readOnlyHint: true },
  handler: async (args, ctx) => {
    return await httpGet<RankRadarKeywordList>(
      { config: ctx.config, toolName: "get_rank_radar_data" },
      `/v1/niches/rank-radars/${encodeURIComponent(args.rankRadarId)}`,
      {
        startDate: args.startDate,
        endDate: args.endDate,
        currentPage: args.currentPage,
        pageSize: args.pageSize,
      },
    );
  },
};
