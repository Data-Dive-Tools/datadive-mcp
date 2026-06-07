import { httpGet } from "../http/client.js";
import type { IndexingIssueAlertList } from "../types/api.js";
import { alertsQueryInputSchema } from "./alert-query.js";
import type { ToolDefinition } from "./types.js";

export const listIndexingIssueAlertsTool: ToolDefinition<typeof alertsQueryInputSchema> = {
  name: "list_indexing_issue_alerts",
  title: "List Indexing-Issue Alerts",
  description:
    "Use this to find products that may have lost search visibility. Retrieves a paginated list of " +
    "indexing-issue alerts across the user's connected Amazon seller accounts — an alert fires when one of " +
    "their ASINs is no longer indexed for its tracked keywords. By default returns active (unresolved) alerts " +
    "from the last 30 days; filter by `sellerId`, `marketplace`, `status`, or `updatedSince` (for incremental " +
    "polling). Each item includes id, asin, title, imageUrl, isParent, sellerId, marketplace, lastAlertedAt, " +
    "and resolvedAt. Supports pagination metadata (currentPage, pageSize, total, lastPage, hasNext, hasPrev).",
  inputSchema: alertsQueryInputSchema,
  handler: async (args, ctx) => {
    return await httpGet<IndexingIssueAlertList>(
      { config: ctx.config, toolName: "list_indexing_issue_alerts" },
      "/v1/alerts/indexing-issues",
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
