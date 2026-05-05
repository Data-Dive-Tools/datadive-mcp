import { z } from "zod";
import { httpGet } from "../http/client.js";
import type { NicheRankingJuices } from "../types/api.js";
import type { ToolDefinition } from "./types.js";

const inputSchema = {
  nicheId: z.string().min(1).describe("The unique identifier of the Niche (from `list_niches`)."),
};

export const getRankingJuiceTool: ToolDefinition<typeof inputSchema> = {
  name: "get_ranking_juice",
  title: "Get Ranking Juices for a Niche",
  description:
    "Use this when the user asks 'how do I rank higher', 'what's my ranking juice', or wants " +
    "listing-optimization guidance. " +
    "Retrieves the Ranking Juices for each Competitor within the specified Niche. Ranking Juice is " +
    "DataDive's proprietary metric identifying the key factors driving search-ranking success " +
    "for each Competitor's listing. Returns currentListing and optimizedListing breakdowns " +
    "(rankingJuice + per-property contributions: title, bullets, description) plus per-competitor " +
    "listing scores and the latestResearchDate.",
  inputSchema,
  handler: async (args, ctx) => {
    return await httpGet<NicheRankingJuices>(
      { config: ctx.config, toolName: "get_ranking_juice" },
      `/v1/niches/${encodeURIComponent(args.nicheId)}/ranking-juices`,
    );
  },
};
