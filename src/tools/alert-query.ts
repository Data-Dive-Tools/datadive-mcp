/**
 * Shared input schema for the /v1/alerts/* list tools. Both alert endpoints
 * accept the same backend query DTO (ExternalAlertsQueryDto), so the input
 * contract is defined once here and imported by each tool.
 */

import { z } from "zod";
import { ALERT_STATUSES, ISO_8601, SUPPORTED_MARKETPLACES } from "../types/api.js";

export const alertsQueryInputSchema = {
  sellerId: z
    .string()
    .min(1)
    .max(50)
    .optional()
    .describe('Filter to a single connected Amazon seller account ID, e.g. "A1B2C3D4E5".'),
  marketplace: z
    .enum(SUPPORTED_MARKETPLACES)
    .optional()
    .describe('Filter to a single Amazon marketplace code, e.g. "com" for amazon.com or "co.uk" for amazon.co.uk.'),
  status: z
    .enum(ALERT_STATUSES)
    .optional()
    .describe(
      "Lifecycle filter. `active` (default) returns unresolved alerts, `resolved` returns resolved alerts, " +
        "`all` returns both. Dismissed alerts are never returned.",
    ),
  updatedSince: z
    .string()
    .regex(ISO_8601, "updatedSince must be an ISO-8601 date or timestamp (e.g. 2026-05-01 or 2026-05-01T00:00:00Z)")
    .optional()
    .describe(
      "ISO-8601 timestamp; return only alerts surfaced at or after this time (filters on `lastAlertedAt`). " +
        "Use it to incrementally sync since your last poll. Defaults to the last 30 days when omitted.",
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
