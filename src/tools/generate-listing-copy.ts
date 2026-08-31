import { z } from "zod";
import { httpPost } from "../http/client.js";
import { LISTING_COPY_STRATEGIES, type CreateListingCopyResult } from "../types/api.js";
import { requireConfirmation } from "./confirm.js";
import type { ToolDefinition } from "./types.js";

const inputSchema = {
  nicheId: z
    .string()
    .min(1)
    .describe("The niche whose keyword data the copy is written from. Get one from `list_niches`."),
  strategy: z
    .enum(LISTING_COPY_STRATEGIES)
    .describe(
      "Which generation strategy to use. `cosmo` targets Amazon's COSMO relevance model, `ranking-juice` " +
        "optimises for DataDive's ranking-juice score, `nlp` writes for keyword coverage, and `cosmo-rufus` " +
        "targets COSMO plus the Rufus shopping assistant. Ask the user if they have no preference.",
    ),
  currentListing: z
    .record(z.union([z.string(), z.array(z.string())]))
    .describe(
      "The seller's existing listing to rewrite, as an object — e.g. " +
        '`{ "title": "...", "description": "...", "bullets": ["...", "..."] }`. Pass what the user has; ' +
        "it is the starting point the generated copy builds on.",
    ),
  confirm: z
    .boolean()
    .optional()
    .describe(
      "Must be true to proceed — each generation spends one AI Copywriter prompt from the quota. " +
        "Confirm the cost with the user first.",
    ),
};

export const generateListingCopyTool: ToolDefinition<typeof inputSchema> = {
  name: "generate_listing_copy",
  title: "Generate Listing Copy for a Niche",
  description:
    "Use this to draft an optimised Amazon listing — title, bullets and description — from a niche's keyword " +
    "research and the seller's current listing. It writes text only: nothing is published to Amazon, and the " +
    "user still has to paste the result into Seller Central. ⚠️ Spends one AI Copywriter prompt from the " +
    "quota per call and cannot be undone — set `confirm: true` only after the user approves. Not safe to " +
    "retry: each call spends another prompt, so if a call errors or times out, poll " +
    "`get_listing_copy_generation_status` instead of re-calling. Runs asynchronously: returns a " +
    "`generationId` — poll `get_listing_copy_generation_status` with it until the status is `complete`.",
  inputSchema,
  annotations: { readOnlyHint: false, destructiveHint: true, openWorldHint: false },
  handler: async (args, ctx) => {
    const pending = requireConfirmation(
      args.confirm,
      ctx,
      "Generating listing copy consumes one AI Copywriter prompt from the organization's quota. " +
        "Check the remaining balance with `get_quota` if the user needs it.",
    );
    if (pending) return pending;

    // The API field is still named `prompt`/`listingToInclude`; the tool surface uses
    // `strategy`/`currentListing` because those read as what they are to a model.
    return await httpPost<CreateListingCopyResult>(
      { config: ctx.config, toolName: "generate_listing_copy" },
      `/v1/niches/${encodeURIComponent(args.nicheId)}/ai-copywriter`,
      { prompt: args.strategy, listingToInclude: args.currentListing },
    );
  },
};
