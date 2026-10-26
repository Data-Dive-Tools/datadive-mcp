import { z } from "zod";
import { httpGet } from "../http/client.js";
import { FAST_KEYWORDS_MAX_PAGE_SIZE, SUPPORTED_MARKETPLACES, type FastKeywordsList } from "../types/api.js";
import type { ToolDefinition } from "./types.js";

const inputSchema = {
  currentPage: z.number().int().min(1).optional().describe("Page number, 1-indexed. Defaults to 1."),
  pageSize: z
    .number()
    .int()
    .min(1)
    .max(FAST_KEYWORDS_MAX_PAGE_SIZE)
    .optional()
    .describe(`Items per page (max ${FAST_KEYWORDS_MAX_PAGE_SIZE}). Defaults to 20.`),
  search: z
    .string()
    .trim()
    .min(1)
    .max(200)
    .optional()
    .describe("Case-insensitive partial match on ASIN, product title or brand."),
  marketplace: z.enum(SUPPORTED_MARKETPLACES).optional().describe("Only Fast Keywords runs from this marketplace."),
};

export const listFastKeywordsTool: ToolDefinition<typeof inputSchema> = {
  name: "list_fast_keywords",
  title: "List Fast Keywords Runs",
  description:
    "Use this first when the user asks about their Fast Keywords runs, or to find a `fastKeywordsId` for " +
    "`get_fast_keywords`, `get_fast_keywords_keywords` or `refresh_fast_keywords`. Fast Keywords finds the " +
    "keywords a product ranks for from just an ASIN, in minutes and for 1 Dive token, without a full niche " +
    "dive. Lists the runs of the whole organization, newest request first: `fastKeywordsId`, `asin`, " +
    "`parentAsin`, `marketplace`, `status` (`in-progress`, `success` or `failed`), `title`, `brand`, `price`, " +
    "`keywordCount`, `totalSearchVolume`, `top10OrganicRankCount`, `rootCount`, `lastRefreshedAt` and " +
    "`requestedAt`, plus pagination metadata (currentPage, pageSize, total, lastPage, hasNext, hasPrev). " +
    "Narrow with `search` or `marketplace`.",
  inputSchema,
  annotations: { readOnlyHint: true },
  handler: async (args, ctx): Promise<FastKeywordsList> => {
    return await httpGet<FastKeywordsList>({ config: ctx.config, toolName: "list_fast_keywords" }, "/v1/fast-keywords", {
      currentPage: args.currentPage,
      pageSize: args.pageSize,
      search: args.search,
      marketplace: args.marketplace,
    });
  },
};
