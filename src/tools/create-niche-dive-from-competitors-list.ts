import { z } from "zod";
import { httpPost } from "../http/client.js";
import { SUPPORTED_MARKETPLACES, type CreateNicheDiveResult } from "../types/api.js";
import { requireConfirmation } from "./confirm.js";
import type { ToolDefinition } from "./types.js";

/** Mirrors the API's `MIN_REQUIRED_ASINS_FOR_DIVE` and `MAX_ASINS_PER_DIVE_WITH_COMPETITORS`. */
export const DIVE_FROM_COMPETITORS_MIN_ASINS = 2;
export const DIVE_FROM_COMPETITORS_MAX_ASINS = 200;

/**
 * The API upper-cases and trims each ASIN before its uniqueness check, so "b0abc" and "B0ABC" are
 * the same competitor there. Normalising here makes the duplicate check below agree with it, and
 * the cost note count the ASINs the API will actually charge for.
 */
const normalizedAsins = z
  .array(z.string().trim().min(1).toUpperCase())
  .min(DIVE_FROM_COMPETITORS_MIN_ASINS)
  .max(DIVE_FROM_COMPETITORS_MAX_ASINS)
  .refine((asins) => new Set(asins).size === asins.length, {
    message: "asins must not contain the same ASIN twice",
  });

const inputSchema = {
  marketplace: z
    .enum(SUPPORTED_MARKETPLACES)
    .describe(
      "Amazon marketplace where the ASINs are listed. Full domain suffixes: com, ca, co.uk, com.mx, in, " +
        "fr, de, es, it, co.jp (e.g. UK is `co.uk`, not `uk`).",
    ),
  asins: normalizedAsins.describe(
    `The exact competitor ASINs to build the niche from, ${DIVE_FROM_COMPETITORS_MIN_ASINS} to ` +
      `${DIVE_FROM_COMPETITORS_MAX_ASINS}, each once. No other competitors are added.`,
  ),
  confirm: z
    .boolean()
    .optional()
    .describe(
      "Must be true to proceed — this dive spends dive tokens for every ASIN. Confirm the cost with the user first.",
    ),
};

export const createNicheDiveFromCompetitorsListTool: ToolDefinition<typeof inputSchema> = {
  name: "create_niche_dive_from_competitors_list",
  title: "Create a Niche Dive from a Competitor List",
  description:
    "Use this when the user already knows which products belong in the niche — e.g. they list competitor " +
    "ASINs, or picked them from search results — and wants niche research on exactly those. Unlike " +
    "`create_niche_dive`, which discovers competitors around one seed ASIN, this builds the niche from the " +
    `given ASINs only (${DIVE_FROM_COMPETITORS_MIN_ASINS}-${DIVE_FROM_COMPETITORS_MAX_ASINS}). ⚠️ Spends dive ` +
    "tokens for every ASIN and cannot be undone — set `confirm: true` only after the user approves the cost. " +
    "Not safe to retry: each call spends tokens again and starts a separate dive — if a call errors or times " +
    "out, poll `get_dive_status` (or check `list_niches`) instead of re-calling. Fails without spending " +
    "tokens when the ASIN count is over the plan's limit, when the account is at its niche limit, or when " +
    "Amazon product data cannot be found for enough of the ASINs. The dive runs asynchronously: this " +
    "returns a `diveId` and an `estimatedCompletionDate`; poll `get_dive_status` with the `diveId` until it " +
    "reports `success`, which carries the new `nicheId`.",
  inputSchema,
  // Additive rather than destructive, but flagged destructive so clients prompt before the
  // irreversible token spend — same reasoning as create_niche_dive. The confirm gate enforces it.
  annotations: { readOnlyHint: false, destructiveHint: true, openWorldHint: false },
  handler: async (args, ctx) => {
    const pending = requireConfirmation(
      args.confirm,
      ctx,
      `Creating this dive consumes dive tokens — one batch per ASIN analyzed (${args.asins.length} ASINs given).`,
    );
    if (pending) return pending;

    return await httpPost<CreateNicheDiveResult>(
      { config: ctx.config, toolName: "create_niche_dive_from_competitors_list" },
      "/v1/niches/dive_with_competitors",
      { marketplace: args.marketplace, asins: args.asins },
    );
  },
};
