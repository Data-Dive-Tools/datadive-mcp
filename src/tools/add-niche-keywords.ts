import { z } from "zod";
import { httpPost } from "../http/client.js";
import { ApiError } from "../http/errors.js";
import {
  NICHE_KEYWORDS_MAX_PER_CALL,
  type AddNicheKeywordsResult,
  type MaxTokensExceededBody,
} from "../types/api.js";
import { confirmationRequired, needsConfirmation, type ConfirmationRequired } from "./confirm.js";
import { nicheKeywordList } from "./niche-keyword-list.js";
import type { ToolDefinition } from "./types.js";

const inputSchema = {
  nicheId: z.string().min(1).describe("The niche whose Master Keyword List to add to. Get one from `list_niches`."),
  keywords: nicheKeywordList.describe(
    `The keywords to add, 1–${NICHE_KEYWORDS_MAX_PER_CALL} per call, at most 255 characters each. They are ` +
      "lower-cased and trimmed, and must be unique after that. Put every keyword in one call: this tool " +
      "allows only 2 calls per minute per niche.",
  ),
  confirm: z
    .boolean()
    .optional()
    .describe(
      "Leave unset on the first call. Set to true only after the user approved the Dive token cost from a " +
        "`confirmation_required` response — it lets the add re-dive a stale niche.",
    ),
  maxTokensUsed: z
    .number()
    .int()
    .min(0)
    .optional()
    .describe(
      "With `confirm: true`: the `tokenCost` the user approved. The call then fails with nothing saved or " +
        "charged rather than spend more. Ignored without `confirm`, where the tool never spends anything.",
    ),
};

/** The gate payload for a stale niche, carrying the API's own figure for the re-dive. */
export interface AddNicheKeywordsConfirmation extends ConfirmationRequired {
  /** The most the re-dive can cost, in Dive tokens: the niche's competitor count. */
  tokenCost: number;
}

function isMaxTokensExceededBody(body: unknown): body is MaxTokensExceededBody {
  if (!body || typeof body !== "object") return false;
  const b = body as Record<string, unknown>;
  return b.error === "MAX_TOKENS_EXCEEDED" && typeof b.tokensUsed === "number";
}

export const addNicheKeywordsTool: ToolDefinition<typeof inputSchema> = {
  name: "add_niche_keywords",
  title: "Add Keywords to a Niche's Master Keyword List",
  description:
    "Use this to add keywords to a niche's Master Keyword List (MKL): the user's own search terms, or " +
    "keywords from the niche's Outliers or Residue lists. Free while the niche is fresh (dived in the last " +
    "24 hours, or a dive is running): the first call adds the keywords at once and they are readable with " +
    "`get_niche_keywords`. On a stale niche, any keyword new to the niche makes the add re-dive the whole " +
    "niche with its current competitors, which spends one Dive token per competitor. The first call then " +
    "saves and spends nothing and returns `confirmation_required` with `tokenCost`; after the user approves, " +
    "call again with `confirm: true` and `maxTokensUsed` set to that `tokenCost`. Keywords moved in from " +
    "Outliers or Residue never cost anything. Returns `originBreakdown` (`alreadyInMkl`, `takenFromOutliers`, " +
    "`takenFromResidue`, `addedManually`) and `tokensUsed`. When `refresh` is present a re-dive is running: " +
    "poll `get_dive_status` with `refresh.diveId`; the `addedManually` keywords show in the MKL once it " +
    "succeeds. A confirmed call is not safe to retry: if it errors or times out, poll `get_dive_status` or " +
    "re-read `get_niche_keywords` instead of re-calling. Limited to 2 calls per minute per niche, so batch " +
    "keywords into one call. Undo with `remove_niche_keywords`.",
  inputSchema,
  // Like redive_niche: additive, but it can spend Dive tokens irreversibly, which is what clients
  // need to prompt on. The confirm gate covers the paid path regardless.
  annotations: { readOnlyHint: false, destructiveHint: true, openWorldHint: false },
  handler: async (args, ctx): Promise<AddNicheKeywordsResult | AddNicheKeywordsConfirmation> => {
    const request = { config: ctx.config, toolName: "add_niche_keywords" };
    const path = `/v1/niches/${encodeURIComponent(args.nicheId)}/keywords`;

    if (needsConfirmation(args.confirm, ctx)) {
      // A real call capped at 0 tokens, not a dry run followed by a real call: a fresh niche is free,
      // so this one request does the add, while a stale one is refused with the re-dive's cost and
      // nothing saved. A dry run would spend half the route's 2-per-minute allowance on every free add.
      // `maxTokensUsed` is set only here and on the confirmed path, never taken from an unconfirmed
      // caller, so an unconfirmed call can never spend.
      try {
        return await httpPost<AddNicheKeywordsResult>(request, path, {
          keywords: args.keywords,
          maxTokensUsed: 0,
        });
      } catch (err) {
        if (err instanceof ApiError && isMaxTokensExceededBody(err.body)) {
          const tokenCost = err.body.tokensUsed;
          return {
            ...confirmationRequired(
              `This niche was last dived more than 24 hours ago, so adding keywords that are new to it ` +
                `re-dives the whole niche with its current competitors: up to ${tokenCost} Dive tokens, one ` +
                "per competitor (less if some can no longer be found). Nothing was added or charged yet.",
            ),
            tokenCost,
          };
        }
        throw err;
      }
    }

    // Confirmed, or the gate is opted out via DATADIVE_AUTO_CONFIRM_WRITES. `maxTokensUsed` left unset
    // means no cap; JSON.stringify drops it.
    return await httpPost<AddNicheKeywordsResult>(request, path, {
      keywords: args.keywords,
      maxTokensUsed: args.maxTokensUsed,
    });
  },
};
