import { z } from "zod";
import { httpGet } from "../http/client.js";
import { SUPPORTED_MARKETPLACES, type InventoryByFcResponse } from "../types/api.js";
import type { ToolDefinition } from "./types.js";

const inputSchema = {
  sellerId: z
    .string()
    .min(1)
    .describe(
      "Amazon seller account ID as connected to DataDive. Get it from `list_seller_profiles`, or find it on the Connections page at https://2.datadive.tools.",
    ),
  marketplace: z
    .enum(SUPPORTED_MARKETPLACES)
    .describe('Amazon marketplace code, e.g. "com" for amazon.com or "co.uk" for amazon.co.uk.'),
  asin: z
    .string()
    .regex(/^[A-Z0-9]{10}$/, "ASIN must be 10 uppercase alphanumeric characters (e.g. B08XYZ1234).")
    .describe(
      "Amazon Standard Identification Number (10 uppercase alphanumeric characters, e.g. B08XYZ1234).",
    ),
};

export const getAsinInventoryDistributionTool: ToolDefinition<typeof inputSchema> = {
  name: "get_asin_inventory_distribution",
  title: "Get Per-Fulfillment-Center Inventory Distribution for an ASIN",
  description:
    "Use this when the user asks about inventory levels, stock by fulfillment center, " +
    "or where their units are sitting across Amazon's fulfillment network for a specific ASIN. " +
    "Requires the Amazon sellerId (from `list_seller_profiles` or the user's DataDive Connections " +
    "page at https://2.datadive.tools), the marketplace code, and the ASIN. Returns totalSellableUnits " +
    "and a per-FC `distribution` array (fc, state, availableStock, availableStockPercentage). " +
    "`lastUpdatedAt` may be null when no successful inventory ingestion has occurred in the last 30 days.",
  inputSchema,
  handler: async (args, ctx) => {
    return await httpGet<InventoryByFcResponse>(
      { config: ctx.config, toolName: "get_asin_inventory_distribution" },
      `/v1/sellers/${encodeURIComponent(args.sellerId)}/marketplaces/${encodeURIComponent(
        args.marketplace,
      )}/asins/${encodeURIComponent(args.asin)}/inventory`,
    );
  },
};
