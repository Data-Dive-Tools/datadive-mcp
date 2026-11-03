import { z } from "zod";
import { httpGet } from "../http/client.js";
import { KEYWORD_LIST_MAX_PAGE_SIZE, type KeywordListPage } from "../types/api.js";
import type { ToolDefinition } from "./types.js";

const inputSchema = {
  nicheId: z.string().min(1).describe("The unique identifier of the Niche (from `list_niches`)."),
  currentPage: z.number().int().min(1).optional().describe("Page number, 1-indexed. Defaults to 1."),
  pageSize: z
    .number()
    .int()
    .min(1)
    .max(KEYWORD_LIST_MAX_PAGE_SIZE)
    .optional()
    .describe(`Keywords per page (max ${KEYWORD_LIST_MAX_PAGE_SIZE}). Defaults to 20.`),
};

const RETURNS =
  "For each keyword, returns search volume, relevancy, competitor ASIN organic ranks (asinRanks: " +
  "{ ASIN -> rank | null }) and the exact-match `suggestedBid` (`min` / `max` / `median` in cents; null when " +
  "not yet fetched for the latest dive), plus `latestResearchDate` and pagination metadata (currentPage, " +
  `pageSize, total, lastPage, hasNext, hasPrev). A page holds at most ${KEYWORD_LIST_MAX_PAGE_SIZE} keywords; ` +
  "keep requesting the next page while `hasNext` is true. To move a keyword into the Master Keyword List, " +
  "use `add_niche_keywords`.";

function keywordListTool(
  name: string,
  title: string,
  list: "outlier_keywords" | "residue_keywords",
  intro: string,
): ToolDefinition<typeof inputSchema> {
  return {
    name,
    title,
    description: `${intro} ${RETURNS}`,
    inputSchema,
    annotations: { readOnlyHint: true },
    handler: async (args, ctx): Promise<KeywordListPage> =>
      await httpGet<KeywordListPage>(
        { config: ctx.config, toolName: name },
        `/v1/niches/${encodeURIComponent(args.nicheId)}/${list}`,
        { currentPage: args.currentPage, pageSize: args.pageSize },
      ),
  };
}

export const getNicheOutlierKeywordsTool = keywordListTool(
  "get_niche_outlier_keywords",
  "Get the Outlier Keywords of a Niche",
  "outlier_keywords",
  "Use this when the user asks about a niche's Outliers: high search volume keywords that only a few of " +
    "the niche's competitors rank for, so they fall outside the Master Keyword List (`get_niche_keywords`).",
);

export const getNicheResidueKeywordsTool = keywordListTool(
  "get_niche_residue_keywords",
  "Get the Residue Keywords of a Niche",
  "residue_keywords",
  "Use this when the user asks about a niche's Residue: the niche's keywords that are in neither the " +
    "Master Keyword List (`get_niche_keywords`) nor the Outliers (`get_niche_outlier_keywords`).",
);
