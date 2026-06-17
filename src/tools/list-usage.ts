import { z } from "zod";
import { httpGet } from "../http/client.js";
import { BILLABLE_FEATURE_TYPES, ISO_8601, type UsageLogList } from "../types/api.js";
import type { ToolDefinition } from "./types.js";

const inputSchema = {
  type: z
    .enum(BILLABLE_FEATURE_TYPES)
    .optional()
    .describe("Filter to a single billable feature type. Omit to return all types."),
  search: z
    .string()
    .min(1)
    .optional()
    .describe("Case-insensitive partial match on the user's name or email."),
  startDate: z
    .string()
    .regex(ISO_8601, "startDate must be an ISO-8601 date or timestamp (e.g. 2026-05-01 or 2026-05-01T00:00:00Z)")
    .optional()
    .describe("ISO-8601 date/timestamp; return only usage logs recorded on or after this time."),
  endDate: z
    .string()
    .regex(ISO_8601, "endDate must be an ISO-8601 date or timestamp (e.g. 2026-05-31 or 2026-05-31T23:59:59Z)")
    .optional()
    .describe("ISO-8601 date/timestamp; return only usage logs recorded on or before this time."),
  currentPage: z.number().int().min(1).optional().describe("Page number, 1-indexed. Defaults to 1."),
  pageSize: z
    .number()
    .int()
    .min(1)
    .max(200)
    .optional()
    .describe("Items per page (max 200). Defaults to 50."),
};

export const listUsageTool: ToolDefinition<typeof inputSchema> = {
  name: "list_usage",
  title: "List Billable Usage Logs",
  description:
    "Use this when the user asks who consumed tokens, how their quota was spent, or wants an audit of " +
    "billable activity over a date range. " +
    "Retrieves a paginated list of billable feature usage logs for the organization — each entry is a " +
    "token-consumption event (a dive, rank-radar creation, AI copywriter prompt, etc.). Filter by `type` " +
    "(billable feature), `search` (user name/email), and `startDate`/`endDate`. Each item includes name, " +
    "email, qty (tokens consumed), type, action (specific operation), nicheId/nicheName, rankRadarId, and " +
    "date, plus pagination metadata (currentPage, pageSize, total, lastPage, hasNext, hasPrev).",
  inputSchema,
  handler: async (args, ctx) => {
    return await httpGet<UsageLogList>(
      { config: ctx.config, toolName: "list_usage" },
      "/v1/usage",
      {
        type: args.type,
        search: args.search,
        startDate: args.startDate,
        endDate: args.endDate,
        currentPage: args.currentPage,
        pageSize: args.pageSize,
      },
    );
  },
};
