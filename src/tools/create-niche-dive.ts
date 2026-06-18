import { z } from "zod";
import { httpPost } from "../http/client.js";
import { SUPPORTED_MARKETPLACES, type CreateNicheDiveResult } from "../types/api.js";
import { requireConfirmation } from "./confirm.js";
import type { ToolDefinition } from "./types.js";

const inputSchema = {
  marketplace: z
    .enum(SUPPORTED_MARKETPLACES)
    .describe(
      "Amazon marketplace of the seed ASIN. Note these are full domain suffixes: com, ca, " +
        "co.uk, com.mx, in, fr, de, es, it, co.jp (e.g. UK is `co.uk`, not `uk`).",
    ),
  asin: z
    .string()
    .min(1)
    .describe("The seed ASIN to start the dive from (e.g. B08N5WRWNW). Competitors are built around it."),
  numberOfCompetitors: z
    .number()
    .int()
    .min(2)
    .describe("How many competitors to analyze (minimum 2). More competitors = deeper niche but more dive tokens."),
  confirm: z
    .boolean()
    .optional()
    .describe("Must be true to proceed — creating a dive spends dive tokens. Confirm the cost with the user first."),
};

export const createNicheDiveTool: ToolDefinition<typeof inputSchema> = {
  name: "create_niche_dive",
  title: "Create a Niche Dive",
  description:
    "Use this to start new niche research from a seed ASIN. ⚠️ Spends dive tokens (cost scales with " +
    "`numberOfCompetitors`) and cannot be undone — set `confirm: true` only after the user approves the cost. " +
    "The dive runs asynchronously: this returns immediately with a `diveId` and an `estimatedCompletionDate`. " +
    "Poll `get_dive_status` with that `diveId` until it reports `success` (which carries the new `nicheId` for " +
    "use with `list_niches`, `get_niche_keywords`, etc.). Requires `marketplace`, `asin`, and `numberOfCompetitors` (min 2).",
  inputSchema,
  // destructiveHint is technically "additive" here (a dive creates a new niche, it
  // doesn't destroy data), but we flag it destructive so clients prompt before the
  // irreversible token spend. The confirm gate enforces this server-side regardless.
  annotations: { readOnlyHint: false, destructiveHint: true },
  handler: async (args, ctx) => {
    const pending = requireConfirmation(
      args.confirm,
      ctx,
      `Creating this dive consumes dive tokens — one batch per competitor analyzed (${args.numberOfCompetitors} requested).`,
    );
    if (pending) return pending;

    return await httpPost<CreateNicheDiveResult>(
      { config: ctx.config, toolName: "create_niche_dive" },
      "/v1/niches/dives",
      {
        marketplace: args.marketplace,
        asin: args.asin,
        numberOfCompetitors: args.numberOfCompetitors,
      },
    );
  },
};
