import { z } from "zod";
import { httpGet } from "../http/client.js";
import { FAST_KEYWORDS_MAX_PAGE_SIZE, type FastKeywordsKeywordList } from "../types/api.js";
import type { ToolDefinition } from "./types.js";

const inputSchema = {
  fastKeywordsId: z
    .number()
    .int()
    .min(1)
    .describe("The Fast Keywords result id, from `run_fast_keywords` or `list_fast_keywords`."),
  currentPage: z.number().int().min(1).optional().describe("Page number, 1-indexed. Defaults to 1."),
  pageSize: z
    .number()
    .int()
    .min(1)
    .max(FAST_KEYWORDS_MAX_PAGE_SIZE)
    .optional()
    .describe(`Keywords per page (max ${FAST_KEYWORDS_MAX_PAGE_SIZE}). Defaults to 20.`),
};

export const getFastKeywordsKeywordsTool: ToolDefinition<typeof inputSchema> = {
  name: "get_fast_keywords_keywords",
  title: "Get the Keywords of a Fast Keywords Result",
  description:
    "Use this to read the keywords of a finished Fast Keywords run (check `status` is `success` with " +
    "`get_fast_keywords` first). Returns `keyword`, `searchVolume`, `organicRank` and `sponsoredRank` per " +
    "keyword, highest search volume first, plus pagination metadata (currentPage, pageSize, total, lastPage, " +
    "hasNext, hasPrev). A page holds at most " +
    `${FAST_KEYWORDS_MAX_PAGE_SIZE} keywords; keep requesting the next page while \`hasNext\` is true.`,
  inputSchema,
  annotations: { readOnlyHint: true },
  handler: async (args, ctx): Promise<FastKeywordsKeywordList> => {
    return await httpGet<FastKeywordsKeywordList>(
      { config: ctx.config, toolName: "get_fast_keywords_keywords" },
      `/v1/fast-keywords/${args.fastKeywordsId}/keywords`,
      { currentPage: args.currentPage, pageSize: args.pageSize },
    );
  },
};
