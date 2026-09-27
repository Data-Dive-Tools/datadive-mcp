import { z } from "zod";
import { httpGet } from "../http/client.js";
import { ApiError } from "../http/errors.js";
import {
  ISO_8601,
  PPC_CAMPAIGN_BASE_SORT_BY,
  PPC_CAMPAIGN_PLACEMENT_SORT_BY,
  PPC_CAMPAIGN_STATES,
  SORT_ORDER,
  type PpcCampaignList,
} from "../types/api.js";
import { sellerMarketplacePath, sellerScopedInputSchema } from "./seller-scoped.js";
import type { ToolDefinition } from "./types.js";

/** Mirrors the API's `MAX_PPC_CAMPAIGNS_WINDOW_DAYS`; a longer window is refused with a 400. */
export const PPC_CAMPAIGNS_MAX_WINDOW_DAYS = 90;

/** Mirrors the API's `@Max(50)` on `pageSize`. */
export const PPC_CAMPAIGNS_MAX_PAGE_SIZE = 50;

const inputSchema = {
  ...sellerScopedInputSchema,
  startDate: z
    .string()
    .regex(
      ISO_8601,
      "startDate must be an ISO-8601 date or timestamp (e.g. 2026-05-01 or 2026-05-01T00:00:00Z)",
    )
    .optional()
    .describe("Start of the reporting window, ISO-8601. Defaults to 30 days before endDate."),
  endDate: z
    .string()
    .regex(
      ISO_8601,
      "endDate must be an ISO-8601 date or timestamp (e.g. 2026-05-31 or 2026-05-31T23:59:59Z)",
    )
    .optional()
    .describe(
      `End of the reporting window, ISO-8601. Defaults to now. At most ${PPC_CAMPAIGNS_MAX_WINDOW_DAYS} days after startDate.`,
    ),
  asin: z
    .string()
    .min(1)
    .optional()
    .describe("Only campaigns advertising this ASIN. Cannot be combined with parentAsin."),
  parentAsin: z
    .string()
    .min(1)
    .optional()
    .describe("Only campaigns advertising any ASIN of this variation family. Cannot be combined with asin."),
  search: z
    .string()
    .min(3)
    .max(200)
    .optional()
    .describe("Partial match on campaign name or advertised ASIN. At least 3 characters."),
  includePlacements: z
    .boolean()
    .optional()
    .describe(
      "Include the per-placement breakdown (topOfSearch, restOfSearch, productPage, offAmazon, each with its " +
        "bid adjustment). Defaults to true; set false for a smaller response when placements are not needed.",
    ),
  sortBy: z
    .enum([...PPC_CAMPAIGN_BASE_SORT_BY, ...PPC_CAMPAIGN_PLACEMENT_SORT_BY])
    .optional()
    .describe(
      `Sort field. Defaults to "name". Any of ${PPC_CAMPAIGN_BASE_SORT_BY.join(", ")}. The placement fields ` +
        '(e.g. "tosSpend", "tosAcos", "ppBidAdjustment") are only accepted when includePlacements is not false.',
    ),
  sortOrder: z.enum(SORT_ORDER).optional().describe('Sort direction. "ASC" (default) or "DESC".'),
  state: z
    .enum(PPC_CAMPAIGN_STATES)
    .optional()
    .describe("Only ENABLED or only PAUSED campaigns. Omit for both."),
  currentPage: z.number().int().min(1).optional().describe("Page number, 1-indexed. Defaults to 1."),
  pageSize: z
    .number()
    .int()
    .min(1)
    .max(PPC_CAMPAIGNS_MAX_PAGE_SIZE)
    .optional()
    .describe(`Campaigns per page (max ${PPC_CAMPAIGNS_MAX_PAGE_SIZE}). Defaults to 20.`),
};

export const listPpcCampaignsTool: ToolDefinition<typeof inputSchema> = {
  name: "list_ppc_campaigns",
  title: "List PPC Campaigns for a Seller",
  description:
    "Use this when the user asks about their Sponsored Products campaigns — which campaigns spend the most, " +
    "which have a high ACOS, how placements (top of search, rest of search, product pages) perform, or which " +
    "campaigns advertise a given product. Requires a `sellerId` + `marketplace` (use `list_seller_profiles` " +
    "to discover them). Narrow to one product with `asin`, or to a variation family with `parentAsin` (not " +
    "both). The reporting window defaults to the last 30 days and cannot exceed " +
    `${PPC_CAMPAIGNS_MAX_WINDOW_DAYS} days. Returns a paginated list where each campaign has campaignId, name, ` +
    "type, state, targetingType, bidStrategy, budget { type, amount, currencyCode }, window totals " +
    "(impressions, clicks, ctr, cpc, cvr, spend, unitsSold, orders, sales, tosImpressionShare, acos, roas, " +
    "tacos), asinCount and, unless includePlacements is false, `placements`; plus pagination metadata " +
    "(currentPage, pageSize, total, lastPage, hasNext, hasPrev). To find the biggest spenders, sort with " +
    '`sortBy: "spend", sortOrder: "DESC"` rather than paging through every campaign. Each call counts toward ' +
    "API usage and is rate limited (about 60 requests/minute). For per-keyword ad data of a Rank Radar, use " +
    "`get_rank_radar_ppc_data`.",
  inputSchema,
  annotations: { readOnlyHint: true },
  handler: async (args, ctx) => {
    if (args.asin && args.parentAsin) {
      // The API refuses the pair too; checking here saves a counted, rate-limited call.
      throw new ApiError(
        "bad_request",
        400,
        "Pass either `asin` (one product) or `parentAsin` (its whole variation family), not both.",
      );
    }

    return await httpGet<PpcCampaignList>(
      { config: ctx.config, toolName: "list_ppc_campaigns" },
      sellerMarketplacePath(args.sellerId, args.marketplace, "ppc/campaigns"),
      {
        startDate: args.startDate,
        endDate: args.endDate,
        asin: args.asin,
        parentAsin: args.parentAsin,
        search: args.search,
        includePlacements: args.includePlacements,
        sortBy: args.sortBy,
        sortOrder: args.sortOrder,
        state: args.state,
        currentPage: args.currentPage,
        pageSize: args.pageSize,
      },
    );
  },
};
