import { z } from "zod";
import { httpPost } from "../http/client.js";
import { ApiError } from "../http/errors.js";
import type { RediveNicheResult } from "../types/api.js";
import { requireConfirmation } from "./confirm.js";
import type { ToolDefinition } from "./types.js";

const inputSchema = {
  nicheId: z.string().min(1).describe("The niche to re-dive. Get one from `list_niches`."),
  mode: z
    .enum(["same_competitors", "discover"])
    .describe(
      "How to pick the competitors for the refreshed dive. `same_competitors` re-runs the niche's " +
        "current competitor set and takes no other argument — use it to refresh stale data. `discover` " +
        "searches for a fresh competitor set, which is what you want when the niche has changed.",
    ),
  numberOfCompetitors: z
    .number()
    .int()
    .min(2)
    .optional()
    .describe(
      "Total ASINs the refreshed dive should contain, including `lockedAsins`. Required in `discover` " +
        "mode and rejected in `same_competitors` mode. Dive tokens are spent per ASIN.",
    ),
  heroAsin: z
    .string()
    .min(1)
    .optional()
    .describe(
      "`discover` mode only. Seed product the competitor discovery starts from. Defaults to the niche's " +
        "highest-selling competitor, preferring one the user's own connected seller account owns.",
    ),
  lockedAsins: z
    .array(z.string().min(1))
    .optional()
    .describe(
      "`discover` mode only. ASINs that must stay in the competitor set regardless of what discovery " +
        "finds. Cannot exceed `numberOfCompetitors`, and cannot overlap `excludedAsins`.",
    ),
  excludedAsins: z
    .array(z.string().min(1))
    .optional()
    .describe("`discover` mode only. ASINs discovery must never select."),
  confirm: z
    .boolean()
    .optional()
    .describe(
      "Must be true to proceed — a re-dive spends dive tokens. Confirm the cost with the user first.",
    ),
};

export const rediveNicheTool: ToolDefinition<typeof inputSchema> = {
  name: "redive_niche",
  title: "Re-dive an Existing Niche",
  description:
    "Use this to refresh an existing niche's research with current Amazon data, instead of creating a new " +
    "niche with `create_niche_dive`. ⚠️ Spends dive tokens (one batch per ASIN dived) and cannot be undone — " +
    "set `confirm: true` only after the user approves the cost. Two modes: `same_competitors` re-dives the " +
    "niche's current competitor set (no other argument needed) and `discover` finds a fresh set, sized by " +
    "`numberOfCompetitors` and steerable with `heroAsin` / `lockedAsins` / `excludedAsins`. Runs " +
    "asynchronously: returns a `diveId` and an `estimatedCompletionDate` — poll `get_dive_status` with that " +
    "`diveId` until it reports `success`. The niche keeps its `nicheId`, so existing rank radars and reports " +
    "follow the refreshed data.",
  inputSchema,
  // Same reasoning as create_niche_dive: a re-dive is additive rather than destructive, but the
  // irreversible token spend is what clients need to prompt on. The confirm gate enforces it regardless.
  annotations: { readOnlyHint: false, destructiveHint: true, openWorldHint: false },
  handler: async (args, ctx) => {
    // `numberOfCompetitors` cannot be required in the schema (same_competitors mode forbids it), so
    // check it here — before the confirm gate, because a gate that cannot state the cost is worse
    // than no gate. Everything else is left to the API, which names the offending field.
    if (args.mode === "discover" && args.numberOfCompetitors === undefined) {
      throw new ApiError(
        "bad_request",
        400,
        "numberOfCompetitors is required in `discover` mode — it is how many ASINs the refreshed dive " +
          "will contain, and therefore what it costs. Ask the user how many competitors they want " +
          '(minimum 2), or use mode "same_competitors" to re-dive the niche\'s current set.',
      );
    }

    const pending = requireConfirmation(
      args.confirm,
      ctx,
      args.mode === "discover"
        ? `Re-diving this niche consumes dive tokens — one batch per ASIN analyzed (${args.numberOfCompetitors} requested).`
        : "Re-diving this niche consumes dive tokens — one batch per competitor currently in the niche. " +
            "Use `get_niche_competitors` first if the user needs the exact count.",
    );
    if (pending) return pending;

    // Mode-specific fields are forwarded as given rather than filtered by mode: the API rejects a
    // field that does not belong to the requested mode with a message naming it, which is a clearer
    // correction for the model than silently dropping what it asked for. `undefined` fields are
    // dropped by JSON.stringify, so an unused optional never reaches the wire.
    return await httpPost<RediveNicheResult>(
      { config: ctx.config, toolName: "redive_niche" },
      `/v1/niches/${encodeURIComponent(args.nicheId)}/redive`,
      {
        mode: args.mode,
        numberOfCompetitors: args.numberOfCompetitors,
        heroAsin: args.heroAsin,
        lockedAsins: args.lockedAsins,
        excludedAsins: args.excludedAsins,
      },
    );
  },
};
