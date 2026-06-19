/**
 * Shared input fields + path builder for the seller+marketplace-scoped tools
 * (/v1/seller_profiles/:sellerId/marketplaces/:marketplace/*). Defined once here
 * and spread into each tool's inputSchema, mirroring alert-query.ts.
 */

import { z } from "zod";
import { SUPPORTED_MARKETPLACES } from "../types/api.js";

export const sellerScopedInputSchema = {
  sellerId: z
    .string()
    .min(1)
    .describe(
      "Amazon seller account ID. Get it from `list_seller_profiles`, or find it on the Connections page at https://2.datadive.tools.",
    ),
  marketplace: z
    .enum(SUPPORTED_MARKETPLACES)
    .describe('Amazon marketplace code, e.g. "com" for amazon.com or "co.uk" for amazon.co.uk.'),
};

/** Builds a `/v1/seller_profiles/:sellerId/marketplaces/:marketplace/<suffix>` path with both params URL-encoded. */
export function sellerMarketplacePath(sellerId: string, marketplace: string, suffix: string): string {
  return `/v1/seller_profiles/${encodeURIComponent(sellerId)}/marketplaces/${encodeURIComponent(
    marketplace,
  )}/${suffix}`;
}
