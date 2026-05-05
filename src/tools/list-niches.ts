import { z } from "zod";
import { httpGet } from "../http/client.js";
import type { NicheList } from "../types/api.js";
import type { ToolDefinition } from "./types.js";

const inputSchema = {
  currentPage: z
    .number()
    .int()
    .min(1)
    .optional()
    .describe("Page number, 1-indexed. Defaults to 1."),
  pageSize: z
    .number()
    .int()
    .min(1)
    .max(100)
    .optional()
    .describe("Items per page (max 100). Defaults to 20."),
};

export const listNichesTool: ToolDefinition<typeof inputSchema> = {
  name: "list_niches",
  title: "List DataDive Niches",
  description:
    "Use this first when the user asks about their niches, or to find a `nicheId` for use with " +
    "`get_niche_keywords`, `get_niche_competitors`, or `get_ranking_juice`. " +
    "Retrieves a paginated list of Niches. Each Niche represents a market segment or product " +
    "category being tracked. Returns nicheId, heroKeyword, nicheLabel, marketplace (com/uk/de/...), " +
    "and latestResearchDate per niche, plus pagination metadata (currentPage, pageSize, total, " +
    "lastPage, hasNext, hasPrev).",
  inputSchema,
  handler: async (args, ctx) => {
    return await httpGet<NicheList>(
      { config: ctx.config, toolName: "list_niches" },
      "/v1/niches",
      { currentPage: args.currentPage, pageSize: args.pageSize },
    );
  },
};
