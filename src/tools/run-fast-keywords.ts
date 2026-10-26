import { z } from "zod";
import { SUPPORTED_MARKETPLACES } from "../types/api.js";
import { runFastKeywords } from "./fast-keywords-run.js";
import type { ToolDefinition } from "./types.js";

const inputSchema = {
  marketplace: z
    .enum(SUPPORTED_MARKETPLACES)
    .describe(
      "Amazon marketplace of the ASIN. Note these are full domain suffixes: com, ca, co.uk, com.mx, in, fr, " +
        "de, es, it, co.jp (e.g. UK is `co.uk`, not `uk`).",
    ),
  asin: z.string().min(1).describe("The ASIN to find keywords for (e.g. B08N5WRWNW)."),
  confirm: z
    .boolean()
    .optional()
    .describe(
      "Leave unset on the first call. Set to true only after the user approved the Dive token cost from the " +
        "`confirmation_required` response.",
    ),
};

export const runFastKeywordsTool: ToolDefinition<typeof inputSchema> = {
  name: "run_fast_keywords",
  title: "Run Fast Keywords",
  description:
    "Use this to find the keywords a product ranks for from just its ASIN — in minutes, without a full niche " +
    "dive. ⚠️ Spends 1 Dive token and cannot be undone. The first call checks eligibility and the Dive token " +
    "balance, spends nothing and returns `confirmation_required` with `tokenCost` and `hasEnoughTokens`; call " +
    "again with `confirm: true` only after the user approves. Not safe to retry: each confirmed call spends a " +
    "token — if it errors or times out, check `list_fast_keywords` instead of re-calling. Returns " +
    "`fastKeywordsId`, `requestId`, `status` and `estimatedCompletionDate`. Poll `get_fast_keywords` with the " +
    "`fastKeywordsId` until `status` is `success` (right away when a fresh result for the same product already " +
    "exists), then read the keywords with `get_fast_keywords_keywords`. To follow up with a full niche dive for " +
    "the same product, pass the `requestId` to `create_niche_dive` as `fastKeywordsRequestId`. Run it again " +
    "later with `refresh_fast_keywords`.",
  inputSchema,
  // Additive, but it spends a Dive token irreversibly, which is what clients need to prompt on. The confirm
  // gate enforces it server-side regardless.
  annotations: { readOnlyHint: false, destructiveHint: true, openWorldHint: false },
  handler: async (args, ctx) => {
    return await runFastKeywords(
      ctx,
      { config: ctx.config, toolName: "run_fast_keywords" },
      "/v1/fast-keywords",
      { marketplace: args.marketplace, asin: args.asin },
      args.confirm,
      "Running Fast Keywords",
    );
  },
};
