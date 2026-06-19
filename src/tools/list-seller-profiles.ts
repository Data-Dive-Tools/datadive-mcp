import { z } from "zod";
import { httpGet } from "../http/client.js";
import type { SellerProfileList } from "../types/api.js";
import type { ToolDefinition } from "./types.js";

const inputSchema = {
  currentPage: z.number().int().min(1).optional().describe("Page number, 1-indexed. Defaults to 1."),
  pageSize: z
    .number()
    .int()
    .min(1)
    .max(50)
    .optional()
    .describe("Items per page (max 50). Defaults to 20."),
};

export const listSellerProfilesTool: ToolDefinition<typeof inputSchema> = {
  name: "list_seller_profiles",
  title: "List Connected Amazon Seller Profiles",
  description:
    "Use this when the user asks which Amazon seller accounts are connected, or as the discovery " +
    "step to find the `sellerId` and `marketplace` required by `get_asin_inventory_distribution`, " +
    "`get_seller_catalog`, `get_seller_listing_changes`, and the alert tools. " +
    "Returns a paginated list of the organization's connected seller profiles — each item has " +
    "sellerId, sellerName, marketplace (e.g. \"com\", \"co.uk\"), hasAdApi (whether Advertising API " +
    "credentials are connected), and createdAt — plus pagination metadata (currentPage, pageSize, " +
    "total, lastPage, hasNext, hasPrev).",
  inputSchema,
  annotations: { readOnlyHint: true },
  handler: async (args, ctx) => {
    return await httpGet<SellerProfileList>(
      { config: ctx.config, toolName: "list_seller_profiles" },
      "/v1/seller_profiles",
      {
        currentPage: args.currentPage,
        pageSize: args.pageSize,
      },
    );
  },
};
