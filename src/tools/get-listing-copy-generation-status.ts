import { z } from "zod";
import { httpGet } from "../http/client.js";
import type { ListingCopyGenerationStatus } from "../types/api.js";
import type { ToolDefinition } from "./types.js";

const inputSchema = {
  nicheId: z.string().min(1).describe("The niche the generation was started for."),
  generationId: z.string().min(1).describe("The `generationId` returned by `generate_listing_copy`."),
};

export const getListingCopyGenerationStatusTool: ToolDefinition<typeof inputSchema> = {
  name: "get_listing_copy_generation_status",
  title: "Get Listing Copy Generation Status",
  description:
    "Use this to poll a listing-copy draft started with `generate_listing_copy` until it finishes. Returns " +
    "one of three shapes keyed by `status`: `generating` (still running — poll again in a few seconds), " +
    "`complete` (with `result`, carrying the generated `title`, `bullets`, `description`, `itemHighlights` " +
    "and its `rankingJuice` score), or `failed` (with an `error` message). Polling is free — it does not " +
    "spend another AI Copywriter prompt, so always poll rather than re-calling `generate_listing_copy`.",
  inputSchema,
  annotations: { readOnlyHint: true },
  handler: async (args, ctx) => {
    return await httpGet<ListingCopyGenerationStatus>(
      { config: ctx.config, toolName: "get_listing_copy_generation_status" },
      `/v1/niches/${encodeURIComponent(args.nicheId)}/ai-copywriter/${encodeURIComponent(args.generationId)}`,
    );
  },
};
