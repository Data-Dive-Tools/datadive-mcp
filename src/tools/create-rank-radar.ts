import { z } from "zod";
import { httpPost } from "../http/client.js";
import type { CreateRankRadarResult } from "../types/api.js";
import { requireConfirmation } from "./confirm.js";
import type { ToolDefinition } from "./types.js";

const inputSchema = {
  asin: z.string().min(1).describe("The ASIN to track keyword rankings for."),
  numberOfKeywords: z
    .number()
    .int()
    .min(1)
    .describe("How many keywords to track (minimum 1). More keywords = broader tracking but more Search Term tokens."),
  nicheId: z
    .string()
    .min(1)
    .describe("The niche this Rank Radar belongs to. Get one from `list_niches`."),
  confirm: z
    .boolean()
    .optional()
    .describe(
      "Must be true to proceed — creating a Rank Radar spends Search Term tokens. Confirm the cost with the user first.",
    ),
};

export const createRankRadarTool: ToolDefinition<typeof inputSchema> = {
  name: "create_rank_radar",
  title: "Create a Rank Radar",
  description:
    "Use this to start tracking organic and sponsored keyword rankings for an ASIN within a niche. " +
    "⚠️ Spends Search Term tokens (cost scales with `numberOfKeywords`) and cannot be undone — set " +
    "`confirm: true` only after the user approves the cost. Returns the new `rankRadarId`; read its data " +
    "later with `get_rank_radar_data`. Requires `asin`, `numberOfKeywords` (min 1), and a `nicheId` from `list_niches`.",
  inputSchema,
  // destructiveHint is technically "additive" here (this creates a new Rank Radar, it
  // doesn't destroy data), but we flag it destructive so clients prompt before the
  // irreversible token spend. The confirm gate enforces this server-side regardless.
  annotations: { readOnlyHint: false, destructiveHint: true },
  handler: async (args, ctx) => {
    const pending = requireConfirmation(
      args.confirm,
      ctx,
      `Creating this Rank Radar consumes Search Term tokens — one per keyword tracked (${args.numberOfKeywords} requested).`,
    );
    if (pending) return pending;

    return await httpPost<CreateRankRadarResult>(
      { config: ctx.config, toolName: "create_rank_radar" },
      "/v1/niches/rank-radars",
      {
        asin: args.asin,
        numberOfKeywords: args.numberOfKeywords,
        nicheId: args.nicheId,
      },
    );
  },
};
