import { z } from "zod";
import { runFastKeywords } from "./fast-keywords-run.js";
import type { ToolDefinition } from "./types.js";

const inputSchema = {
  fastKeywordsId: z
    .number()
    .int()
    .min(1)
    .describe("The Fast Keywords result to refresh, from `run_fast_keywords` or `list_fast_keywords`."),
  confirm: z
    .boolean()
    .optional()
    .describe(
      "Leave unset on the first call. Set to true only after the user approved the Dive token cost from the " +
        "`confirmation_required` response.",
    ),
};

export const refreshFastKeywordsTool: ToolDefinition<typeof inputSchema> = {
  name: "refresh_fast_keywords",
  title: "Refresh Fast Keywords",
  description:
    "Use this to re-run an existing Fast Keywords result with current data. ⚠️ Spends 1 Dive token and cannot " +
    "be undone. The first call checks eligibility and the Dive token balance, spends nothing and returns " +
    "`confirmation_required` with `tokenCost` and `hasEnoughTokens`; call again with `confirm: true` only after " +
    "the user approves. A result can be refreshed once every 24 hours, and not while a run is going: then the " +
    "call fails with a message that says when it is refreshable again (or to poll `get_fast_keywords`), and " +
    "nothing is charged. Not safe to retry after an error or timeout — check `get_fast_keywords` instead. " +
    "Returns `fastKeywordsId`, `requestId`, `status` and `estimatedCompletionDate`; poll `get_fast_keywords` " +
    "until `status` is `success`.",
  inputSchema,
  annotations: { readOnlyHint: false, destructiveHint: true, openWorldHint: false },
  handler: async (args, ctx) => {
    return await runFastKeywords(
      ctx,
      { config: ctx.config, toolName: "refresh_fast_keywords" },
      `/v1/fast-keywords/${args.fastKeywordsId}/refresh`,
      {},
      args.confirm,
      "Refreshing Fast Keywords",
    );
  },
};
