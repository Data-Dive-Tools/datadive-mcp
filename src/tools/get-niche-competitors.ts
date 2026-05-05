import { z } from "zod";
import { httpGet } from "../http/client.js";
import type { GetCompetitorListResult } from "../types/api.js";
import type { ToolDefinition } from "./types.js";

const inputSchema = {
  nicheId: z.string().min(1).describe("The unique identifier of the Niche (from `list_niches`)."),
};

export const getNicheCompetitorsTool: ToolDefinition<typeof inputSchema> = {
  name: "get_niche_competitors",
  title: "Get Competitors and Niche Statistics",
  description:
    "Use this for competitor ASINs, sales/revenue benchmarks, or niche opportunity scoring. " +
    "Retrieves the list of Competitors within the specified Niche along with Niche statistics. " +
    "For the Niche: keyword statistics, opportunity evaluation, benchmark median values, and " +
    "overall competitor strength assessment. For each Competitor: ASIN, sales, revenue, ratings, " +
    "reviews, price, image URL, and ranking data.",
  inputSchema,
  handler: async (args, ctx) => {
    return await httpGet<GetCompetitorListResult>(
      { config: ctx.config, toolName: "get_niche_competitors" },
      `/v1/niches/${encodeURIComponent(args.nicheId)}/competitors`,
    );
  },
};
