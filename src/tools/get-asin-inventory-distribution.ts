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
  title: "Get Inventory Metrics and Fulfillment-Center Distribution for an ASIN",
  description:
    "Use this when the user asks about an ASIN's inventory: stock levels, days of stock or when it will run out, " +
    "low-inventory or aged-inventory risk, low-inventory-level (LILF) or long-term storage (LTSF) fees, or where " +
    "their units sit across Amazon's fulfillment network. Requires the Amazon sellerId (from `list_seller_profiles` " +
    "or the user's DataDive Connections page at https://2.datadive.tools), the marketplace code, and the ASIN. " +
    "Returns the metrics the DataDive Inventory page shows — fulfillableStock, totalStock, reservedStock, " +
    "inboundStock, researchingStock, unfulfillableStock, daysOfStock (with daysOfStockSource AMAZON or ESTIMATE), " +
    "daysOfStock30, daysOfStock90, inLowInventoryState, estWeeklyLilf, estLtsfNextAssessment, ltsfLastMonthActual, " +
    "agedUnits, oldestUnitAgeDays, with fees in `currency` — plus totalSellableUnits and a per-FC `distribution` " +
    "array (fc, state, availableStock, availableStockPercentage). A metric is null, never 0, when Amazon has no data " +
    "(e.g. merchant-fulfilled); metrics the user's plan does not include are null and listed in `lockedFields` " +
    "(say they need a plan upgrade, do not report them as zero). `lastUpdatedAt` dates the stock and metrics; " +
    "`distributionLastUpdatedAt` dates the distribution, which is usually up to 2 days behind. Either may be null " +
    "when no successful refresh happened in the last 30 days.",
  inputSchema,
  annotations: { readOnlyHint: true },
  handler: async (args, ctx) => {
    return await httpGet<InventoryByFcResponse>(
      { config: ctx.config, toolName: "get_asin_inventory_distribution" },
      `/v1/sellers/${encodeURIComponent(args.sellerId)}/marketplaces/${encodeURIComponent(
        args.marketplace,
      )}/asins/${encodeURIComponent(args.asin)}/inventory`,
    );
  },
};
