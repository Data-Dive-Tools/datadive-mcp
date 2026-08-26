import { z } from "zod";
import { httpGet } from "../http/client.js";
import type { NicheList } from "../types/api.js";
import type { ToolDefinition } from "./types.js";

/** Mirrors the API's `PaginationParams.MAX_PAGE_SIZE`; larger values are rejected there with 400. */
export const LIST_NICHES_MAX_PAGE_SIZE = 50;

const inputSchema = {
  currentPage: z
    .number()
    .int()
    .min(1)
    .optional()
    .describe("Page number, 1-indexed. Defaults to 1. Keep requesting the next page while `hasNext` is true."),
  pageSize: z
    .number()
    .int()
    .min(1)
    .max(LIST_NICHES_MAX_PAGE_SIZE)
    .optional()
    .describe(`Items per page (max ${LIST_NICHES_MAX_PAGE_SIZE}). Defaults to 20.`),
  searchText: z
    .string()
    .trim()
    .min(1)
    .max(200)
    .optional()
    .describe(
      "Case-insensitive partial match on the niche label or hero keyword. Prefer this over paging " +
        "through everything when the user names a niche.",
    ),
  searchAsin: z
    .string()
    .trim()
    .regex(/^[A-Za-z0-9]{10}$/, "must be a 10-character ASIN")
    .optional()
    .describe("Only niches whose competitor set contains this ASIN (10 characters, e.g. B08N5WRWNW)."),
  orderBy: z
    .enum(["lastDived", "name"])
    .optional()
    .describe(
      "Sort field: `lastDived` (by latestResearchDate, newest first by default) or `name` " +
        "(by nicheLabel, A→Z by default). Defaults to `lastDived`.",
    ),
  sortOrder: z
    .enum(["ASC", "DESC"])
    .optional()
    .describe("Sort direction. Defaults to DESC for `lastDived` and ASC for `name`."),
};

export const listNichesTool: ToolDefinition<typeof inputSchema> = {
  name: "list_niches",
  title: "List DataDive Niches",
  description:
    "Use this first when the user asks about their niches, or to find a `nicheId` for use with " +
    "`get_niche_keywords`, `get_niche_competitors`, or `get_ranking_juice`. " +
    "Retrieves a paginated list of Niches, newest dive first. Each Niche represents a market segment " +
    "or product category being tracked. Returns nicheId, heroKeyword, nicheLabel, marketplace " +
    "(com/uk/de/...), and latestResearchDate per niche, plus pagination metadata (currentPage, " +
    "pageSize, total, lastPage, hasNext, hasPrev). Narrow with `searchText` (label/keyword) or " +
    "`searchAsin` (a competitor ASIN) instead of scanning pages; a page holds at most " +
    `${LIST_NICHES_MAX_PAGE_SIZE} niches, so the full list of a large account needs several calls.`,
  inputSchema,
  annotations: { readOnlyHint: true },
  handler: async (args, ctx) => {
    return await httpGet<NicheList>(
      { config: ctx.config, toolName: "list_niches" },
      "/v1/niches",
      {
        currentPage: args.currentPage,
        pageSize: args.pageSize,
        searchText: args.searchText,
        searchAsin: args.searchAsin,
        orderBy: args.orderBy,
        sortOrder: args.sortOrder,
      },
    );
  },
};
