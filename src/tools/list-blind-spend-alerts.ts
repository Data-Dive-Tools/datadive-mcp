import { z } from "zod";
import { httpGet } from "../http/client.js";
import { ALERT_STATUSES, type BlindSpendAlertList } from "../types/api.js";
import type { ToolDefinition } from "./types.js";

const inputSchema = {
  sellerId: z
    .string()
    .min(1)
    .max(50)
    .optional()
    .describe("Filter to a single connected Amazon seller account ID, e.g. \"A1B2C3D4E5\"."),
  marketplace: z
    .string()
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

export const listBlindSpendAlertsTool: ToolDefinition<typeof inputSchema> = {
  name: "list_blind_spend_alerts",
  title: "List Blind-Spend (Wasted-Spend) Alerts",
  description:
    "Use this to find wasted PPC ad spend. Retrieves a paginated list of blind-spend alerts across the " +
    "user's connected Amazon seller accounts — an alert flags ad spend on customer search terms that produced " +
    "little or no sales. By default returns active (unresolved) alerts from the last 30 days; filter by " +
    "`sellerId`, `marketplace`, `status`, or `updatedSince` (for incremental polling). Each item includes id, " +
    "asin, title, imageUrl, sellerId, marketplace, lastAlertedAt, resolvedAt, wastedSpend (total ad spend " +
    "across unresolved terms), totalKeywordCount, unresolvedKeywordCount, and searchTerms — the unresolved " +
    "wasted-spend search terms, each with term, spend, sales, clicks, cvr (0-1), and impressions. Supports " +
    "pagination metadata (currentPage, pageSize, total, lastPage, hasNext, hasPrev).",
  inputSchema,
  handler: async (args, ctx) => {
    return await httpGet<BlindSpendAlertList>(
      { config: ctx.config, toolName: "list_blind_spend_alerts" },
      "/v1/alerts/blind-spend",
      {
        sellerId: args.sellerId,
        marketplace: args.marketplace,
        status: args.status,
        updatedSince: args.updatedSince,
        currentPage: args.currentPage,
        pageSize: args.pageSize,
      },
    );
  },
};
