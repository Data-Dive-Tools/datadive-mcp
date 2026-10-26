import { z } from "zod";
import { httpGet } from "../http/client.js";
import type { FastKeywordsResult } from "../types/api.js";
import type { ToolDefinition } from "./types.js";

const inputSchema = {
  fastKeywordsId: z
    .number()
    .int()
    .min(1)
    .describe("The Fast Keywords result id, from `run_fast_keywords`, `refresh_fast_keywords` or `list_fast_keywords`."),
};

export const getFastKeywordsTool: ToolDefinition<typeof inputSchema> = {
  name: "get_fast_keywords",
  title: "Get a Fast Keywords Result",
  description:
    "Use this to poll a Fast Keywords run started with `run_fast_keywords` or `refresh_fast_keywords`, and to " +
    "read its result. While `status` is `in-progress`, wait a few seconds and call again; stop at `success` or " +
    "`failed`. On `failed`, `failureReason` and `failureMessage` say why (safe to show to the user). On `success` " +
    "it returns the product (`title`, `brand`, `price`, `imageUrl`), its `variations`, `keywordCount`, " +
    "`lastRefreshedAt`, the keyword `roots` (`root`, `aggregateSearchVolume`, `medianOrganicRank`, `keywords`) and " +
    "the top 10 `competitors`. `insufficientKeywordData: true` means the run succeeded but found too few " +
    "keywords to be useful. The keyword rows themselves are in `get_fast_keywords_keywords`.",
  inputSchema,
  annotations: { readOnlyHint: true },
  handler: async (args, ctx): Promise<FastKeywordsResult> => {
    return await httpGet<FastKeywordsResult>(
      { config: ctx.config, toolName: "get_fast_keywords" },
      `/v1/fast-keywords/${args.fastKeywordsId}`,
    );
  },
};
