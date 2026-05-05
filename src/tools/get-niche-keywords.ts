import { z } from "zod";
import { httpGet } from "../http/client.js";
import type { GetMasterKeywordListResult } from "../types/api.js";
import type { ToolDefinition } from "./types.js";

const inputSchema = {
  nicheId: z.string().min(1).describe("The unique identifier of the Niche (from `list_niches`)."),
};

export const getNicheKeywordsTool: ToolDefinition<typeof inputSchema> = {
  name: "get_niche_keywords",
  title: "Get Master Keyword List for a Niche",
  description:
    "Use this when the user asks about keywords, search terms, or search volume for a niche. " +
    "Retrieves the master keyword list for the specified Niche — the relevant search terms " +
    "monitored for ranking and performance metrics. For each keyword, returns search volume, " +
    "relevancy (numeric score or \"Outlier\"), and competitor ASIN organic ranks " +
    "(asinRanks: { ASIN -> rank | null }). Also returns the latestResearchDate.",
  inputSchema,
  handler: async (args, ctx) => {
    return await httpGet<GetMasterKeywordListResult>(
      { config: ctx.config, toolName: "get_niche_keywords" },
      `/v1/niches/${encodeURIComponent(args.nicheId)}/keywords`,
    );
  },
};
