import { httpGet } from "../http/client.js";
import type { Quota } from "../types/api.js";
import type { ToolDefinition } from "./types.js";

const inputSchema = {};

export const getQuotaTool: ToolDefinition<typeof inputSchema> = {
  name: "get_quota",
  title: "Get Quota Usage",
  description:
    "Use this when the user asks how much quota or how many tokens they have left, or before creating a " +
    "Niche Dive or Rank Radar to check remaining headroom. " +
    "Returns current quota usage and capacity for each billable feature — DIVED_ASINS (Dive tokens), " +
    "RANK_RADAR_KEYWORDS (tracked keywords), PRODUCT_BRIEF_ASINS, and AI_COPYWRITER_PROMPTS — each with " +
    "`used` and `capacity` (null when unlimited / not applicable), plus `nextRefreshDate` (ISO-8601 " +
    "timestamp of the next quota reset, or null). Takes no arguments.",
  inputSchema,
  handler: async (_args, ctx) => {
    return await httpGet<Quota>({ config: ctx.config, toolName: "get_quota" }, "/v1/quota");
  },
};
