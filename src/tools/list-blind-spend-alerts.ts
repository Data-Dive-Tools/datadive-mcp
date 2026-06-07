import { httpGet } from "../http/client.js";
import type { BlindSpendAlertList } from "../types/api.js";
import { alertsQueryInputSchema } from "./alert-query.js";
import type { ToolDefinition } from "./types.js";

export const listBlindSpendAlertsTool: ToolDefinition<typeof alertsQueryInputSchema> = {
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
  inputSchema: alertsQueryInputSchema,
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
