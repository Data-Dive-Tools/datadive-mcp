import { z } from "zod";
import { httpGet } from "../http/client.js";
import type { FastKeywordsResult, FastKeywordsRoot } from "../types/api.js";
import type { ToolDefinition } from "./types.js";

const inputSchema = {
  fastKeywordsId: z
    .number()
    .int()
    .min(1)
    .describe(
      "The Fast Keywords result id, from `run_fast_keywords`, `refresh_fast_keywords` or `list_fast_keywords`.",
    ),
};

/**
 * The API lists every keyword under every root, which for a busy product is hundreds of roots and
 * thousands of keywords (~240 KB): more than a model can read, and the poll target is called repeatedly.
 * Roots arrive ordered by search volume, so the first ones are the ones worth showing; the keyword rows
 * themselves are paged by `get_fast_keywords_keywords`.
 */
export const MAX_ROOTS = 25;
export const MAX_KEYWORDS_PER_ROOT = 10;

type TrimmedRoot = Omit<FastKeywordsRoot, "keywords"> & { keywordCount: number; keywords: string[] };

export type TrimmedFastKeywordsResult = Omit<FastKeywordsResult, "roots"> & {
  roots: TrimmedRoot[];
  /** Roots in the full result; `roots` holds the first `MAX_ROOTS`. */
  totalRoots: number;
  /** Present only when something was cut. */
  note?: string;
};

export function trimFastKeywordsResult(result: FastKeywordsResult): TrimmedFastKeywordsResult {
  const roots = result.roots ?? [];
  const shown = roots.slice(0, MAX_ROOTS).map(
    (r): TrimmedRoot => ({
      root: r.root,
      aggregateSearchVolume: r.aggregateSearchVolume,
      medianOrganicRank: r.medianOrganicRank,
      keywordCount: r.keywords.length,
      keywords: r.keywords.slice(0, MAX_KEYWORDS_PER_ROOT),
    }),
  );
  const cut = roots.length > MAX_ROOTS || shown.some((r) => r.keywordCount > r.keywords.length);
  return {
    ...result,
    roots: shown,
    totalRoots: roots.length,
    ...(cut && {
      note:
        `Showing the top ${shown.length} of ${roots.length} roots by search volume, each with up to ` +
        `${MAX_KEYWORDS_PER_ROOT} of its keywords (\`keywordCount\` is the full count). ` +
        "Read every keyword with `get_fast_keywords_keywords`.",
    }),
  };
}

export const getFastKeywordsTool: ToolDefinition<typeof inputSchema> = {
  name: "get_fast_keywords",
  title: "Get a Fast Keywords Result",
  description:
    "Use this to poll a Fast Keywords run started with `run_fast_keywords` or `refresh_fast_keywords`, and to " +
    "read its result. While `status` is `in-progress`, wait a few seconds and call again; stop at `success` or " +
    "`failed`. On `failed`, `failureReason` and `failureMessage` say why (safe to show to the user). On `success` " +
    "it returns the product (`title`, `brand`, `price`, `imageUrl`), its `variations`, `keywordCount`, " +
    "`lastRefreshedAt`, the top keyword `roots` by search volume (`root`, `aggregateSearchVolume`, `medianOrganicRank`, " +
    "`keywordCount`, and a sample of its `keywords`; `totalRoots` is how many there are) and the top 10 " +
    "`competitors`. `insufficientKeywordData: true` means the run succeeded but found too few " +
    "keywords to be useful. The keyword rows themselves are in `get_fast_keywords_keywords`.",
  inputSchema,
  annotations: { readOnlyHint: true },
  handler: async (args, ctx): Promise<TrimmedFastKeywordsResult> => {
    const result = await httpGet<FastKeywordsResult>(
      { config: ctx.config, toolName: "get_fast_keywords" },
      `/v1/fast-keywords/${args.fastKeywordsId}`,
    );
    return trimFastKeywordsResult(result);
  },
};
