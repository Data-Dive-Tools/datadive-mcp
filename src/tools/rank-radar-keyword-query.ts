/**
 * Shared inputs for the Rank Radar keyword tools (`get_rank_radar_data`, `get_rank_radar_sqp_data`,
 * `get_rank_radar_ppc_data`). All three API routes take the same date range and keyword paging
 * (RS-11683), so the fields are defined once here and spread into each tool's inputSchema,
 * mirroring seller-scoped.ts.
 */

import { z } from "zod";

/** yyyy-mm-dd matcher used by both startDate and endDate. */
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Mirrors the API's `RANK_RADAR_KEYWORD_LIST_MAX_PAGE_SIZE`. A larger value is not rejected there:
 * it silently falls back to the default page of 20, so the cap has to be enforced here.
 */
export const RANK_RADAR_KEYWORDS_MAX_PAGE_SIZE = 100;

/** Mirrors the API's `MAX_DATE_RANGE_DAYS`; a longer range is refused with a 400. */
export const RANK_RADAR_MAX_DATE_RANGE_DAYS = 90;

export const rankRadarKeywordQueryInputSchema = {
  rankRadarId: z.string().uuid().describe("The Rank Radar UUID (from `list_rank_radars`)."),
  startDate: z
    .string()
    .regex(ISO_DATE, "startDate must be in yyyy-mm-dd format")
    .describe("Start date of the range, yyyy-mm-dd (e.g. 2024-03-26)."),
  endDate: z
    .string()
    .regex(ISO_DATE, "endDate must be in yyyy-mm-dd format")
    .describe(
      "End date of the range, yyyy-mm-dd (e.g. 2024-04-26). Must be on or after startDate, " +
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

/** Description sentence shared by the three tools: how to walk the pages. */
export const RANK_RADAR_KEYWORD_PAGING_NOTE =
  "Results are paged by keyword: `data` holds one page, and the response carries currentPage, pageSize, " +
  "total, lastPage, hasNext and hasPrev. `total` is the Rank Radar's active keyword count; to read every " +
  "keyword, call again with `currentPage` + 1 while `hasNext` is true, using " +
  `\`pageSize\` ${RANK_RADAR_KEYWORDS_MAX_PAGE_SIZE} for large Rank Radars. Paused keywords are not included.`;

export function rankRadarPath(rankRadarId: string, suffix = ""): string {
  return `/v1/niches/rank-radars/${encodeURIComponent(rankRadarId)}${suffix ? `/${suffix}` : ""}`;
}

/** Query params common to the three routes; `undefined` values are dropped by the HTTP client. */
export function rankRadarKeywordQuery(args: {
  startDate: string;
  endDate: string;
  currentPage?: number;
  pageSize?: number;
}) {
  return {
    startDate: args.startDate,
    endDate: args.endDate,
    currentPage: args.currentPage,
    pageSize: args.pageSize,
  };
}
