import { z } from "zod";
import { httpGet } from "../http/client.js";
import {
  ISO_8601,
  LISTING_CHANGE_SORT_BY,
  LISTING_CHANGE_TYPES,
  SORT_ORDER,
  type ListingChangeList,
} from "../types/api.js";
import { sellerMarketplacePath, sellerScopedInputSchema } from "./seller-scoped.js";
import type { ToolDefinition } from "./types.js";

const inputSchema = {
  ...sellerScopedInputSchema,
  types: z
    .array(z.enum(LISTING_CHANGE_TYPES))
    .min(1)
    .optional()
    .describe('Filter to specific change types. Omit for all. Any of "Price", "Content", "Image".'),
  asin: z
    .string()
    .min(1)
    .optional()
    .describe("Filter to an exact ASIN or parent ASIN."),
  brand: z.string().min(1).optional().describe("Case-insensitive partial match on brand name."),
  search: z
    .string()
    .min(1)
    .optional()
    .describe("Case-insensitive partial match on product title or brand."),
  startDate: z
    .string()
    .regex(ISO_8601, "startDate must be an ISO-8601 date or timestamp (e.g. 2026-05-01 or 2026-05-01T00:00:00Z)")
    .optional()
    .describe("ISO-8601 date/timestamp; return only changes detected on or after this time."),
  endDate: z
    .string()
    .regex(ISO_8601, "endDate must be an ISO-8601 date or timestamp (e.g. 2026-05-31 or 2026-05-31T23:59:59Z)")
    .optional()
    .describe("ISO-8601 date/timestamp; return only changes detected on or before this time."),
  sortBy: z
    .enum(LISTING_CHANGE_SORT_BY)
    .optional()
    .describe('Sort field. "date" (default) or "type".'),
  sortOrder: z.enum(SORT_ORDER).optional().describe('Sort direction. "DESC" (default) or "ASC".'),
  includeCorrelations: z
    .boolean()
    .optional()
    .describe(
      "When true, include the ranking/conversion `correlation` object per change (CVR and search-term " +
        "movement before vs after). Defaults to false.",
    ),
  currentPage: z.number().int().min(1).optional().describe("Page number, 1-indexed. Defaults to 1."),
  pageSize: z
    .number()
    .int()
    .min(1)
    .max(50)
    .optional()
    .describe("Items per page (max 50). Defaults to 20."),
};

export const getSellerListingChangesTool: ToolDefinition<typeof inputSchema> = {
  name: "get_seller_listing_changes",
  title: "List Listing Changes for a Seller",
  description:
    "Use this when the user asks what changed on their Amazon listings — price, content (title/bullets/" +
    "description), or image edits — for a seller account. Requires a `sellerId` + `marketplace` (use " +
    "`list_seller_profiles` to discover them). Filter by `types`, `asin`/parent ASIN, `brand`, `search`, " +
    "and a `startDate`/`endDate` range; sort with `sortBy`/`sortOrder`. Set `includeCorrelations: true` to " +
    "attach the ranking/conversion impact per change. Returns a paginated list where each item has asin, " +
    "title, imageUrl, date, type, contentType, description, previousValue, newValue, and (optionally) " +
    "correlation, plus pagination metadata (currentPage, pageSize, total, lastPage, hasNext, hasPrev).",
  inputSchema,
  annotations: { readOnlyHint: true },
  handler: async (args, ctx) => {
    return await httpGet<ListingChangeList>(
      { config: ctx.config, toolName: "get_seller_listing_changes" },
      sellerMarketplacePath(args.sellerId, args.marketplace, "listing-changes"),
      {
        // The API accepts `types` as a comma-separated list.
        types: args.types?.join(","),
        asin: args.asin,
        brand: args.brand,
        search: args.search,
        startDate: args.startDate,
        endDate: args.endDate,
        sortBy: args.sortBy,
        sortOrder: args.sortOrder,
        includeCorrelations: args.includeCorrelations,
        currentPage: args.currentPage,
        pageSize: args.pageSize,
      },
    );
  },
};
