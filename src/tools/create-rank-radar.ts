import { z } from "zod";
import { httpPost } from "../http/client.js";
import type { CreateRankRadarResult } from "../types/api.js";
import { confirmationRequired, needsConfirmation } from "./confirm.js";
import type { ToolDefinition } from "./types.js";

const PATH = "/v1/niches/rank-radars";

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
    "`confirm: true` only after the user approves the cost. Not safe to retry: each call spends tokens again " +
    "and creates a separate Rank Radar — if a call errors or times out, check `list_rank_radars` instead of " +
    "re-calling. The first call previews the creation and may return `warnings` alongside the cost note — " +
    "for example that this product family is already tracked by another Rank Radar. Show every warning " +
    "`message` to the user verbatim, before asking them to confirm; do not summarise it or decide on their " +
    "behalf. A warning never blocks creation. Returns the new `rankRadarId`; read its data " +
    "later with `get_rank_radar_data`. Requires `asin`, `numberOfKeywords` (min 1), and a `nicheId` from `list_niches`.",
  inputSchema,
  // destructiveHint is technically "additive" here (this creates a new Rank Radar, it
  // doesn't destroy data), but we flag it destructive so clients prompt before the
  // irreversible token spend. The confirm gate enforces this server-side regardless.
  annotations: { readOnlyHint: false, destructiveHint: true, openWorldHint: false },
  handler: async (args, ctx) => {
    const request = { config: ctx.config, toolName: "create_rank_radar" };
    const body = {
      asin: args.asin,
      numberOfKeywords: args.numberOfKeywords,
      nicheId: args.nicheId,
    };

    if (needsConfirmation(args.confirm, ctx)) {
      // RS-11615. `dryRun` runs the API's full validation, quota check and duplicate check
      // and creates nothing, so the confirmation payload can carry the API's own warnings —
      // "this family is already tracked", say — instead of only a static cost note. The
      // wording therefore comes from the same endpoint on both passes as the one the DataDive
      // UI shows, and cannot drift from it.
      //
      // `dryRun` is deliberately absent from inputSchema and set only here. If the model could
      // set it, it could dry-run, read a success-shaped response, and tell the user their Rank
      // Radar was created when nothing was created and nothing was spent.
      const preview = await httpPost<CreateRankRadarResult>(request, PATH, { ...body, dryRun: true });

      // A backend older than RS-11615 ignores the unknown `dryRun` field and creates the Rank
      // Radar for real. It gives itself away by returning an id where a dry run returns null.
      // Report what actually happened rather than claiming a confirmation is still pending for
      // something already paid for.
      if (preview.rankRadarId != null) return preview;

      return confirmationRequired(
        `Creating this Rank Radar consumes Search Term tokens — one per keyword tracked (${args.numberOfKeywords} requested).`,
        preview.warnings,
      );
    }

    // Confirmed, or the gate is opted out via DATADIVE_AUTO_CONFIRM_WRITES. On that opt-out
    // path there is no confirmation step at all, so the `warnings` in this response are the
    // only ones the user will ever see — which is why they are returned, not dropped.
    return await httpPost<CreateRankRadarResult>(request, PATH, body);
  },
};
