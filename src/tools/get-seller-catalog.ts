import { z } from "zod";
import { httpGet } from "../http/client.js";
import { CATALOG_STATUSES, type SellerCatalogList } from "../types/api.js";
import { sellerMarketplacePath, sellerScopedInputSchema } from "./seller-scoped.js";
import type { ToolDefinition } from "./types.js";

const inputSchema = {
  ...sellerScopedInputSchema,
  search: z
    .string()
    .min(1)
    .optional()
    .describe("Case-insensitive partial match on product title or brand."),
  brand: z.string().min(1).optional().describe("Case-insensitive partial match on brand name."),
  status: z
    .enum(CATALOG_STATUSES)
    .optional()
    .describe('Listing status filter. "Active" (default) or "all".'),
  currentPage: z.number().int().min(1).optional().describe("Page number, 1-indexed. Defaults to 1."),
  pageSize: z
    .number()
    .int()
    .min(1)
    .max(50)
    .optional()
    .describe("Items per page (max 50). Defaults to 20."),
};

export const getSellerCatalogTool: ToolDefinition<typeof inputSchema> = {
  name: "get_seller_catalog",
  title: "List Catalog ASINs for a Seller",
  description:
    "Use this when the user wants to browse or search a seller's own Amazon catalog — the products " +
    "they sell on a given marketplace. Requires a `sellerId` + `marketplace` (use `list_seller_profiles` " +
    "to discover them). Filter by `search` (title/brand), `brand`, and `status` (Active by default, or " +
    "all). Returns a paginated list where each item has asin, title, parentAsin, brand, status, imageUrl, " +
    "and hasVariations, plus pagination metadata (currentPage, pageSize, total, lastPage, hasNext, hasPrev).",
  inputSchema,
  annotations: { readOnlyHint: true },
  handler: async (args, ctx) => {
    return await httpGet<SellerCatalogList>(
      { config: ctx.config, toolName: "get_seller_catalog" },
      sellerMarketplacePath(args.sellerId, args.marketplace, "catalog"),
      {
        search: args.search,
        brand: args.brand,
        status: args.status,
        currentPage: args.currentPage,
        pageSize: args.pageSize,
      },
    );
  },
};
