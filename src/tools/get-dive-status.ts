import { z } from "zod";
import { httpGet } from "../http/client.js";
import type { DiveStatus } from "../types/api.js";
import type { ToolDefinition } from "./types.js";

const inputSchema = {
  diveId: z.string().min(1).describe("The dive identifier returned by `create_niche_dive`."),
};

export const getDiveStatusTool: ToolDefinition<typeof inputSchema> = {
  name: "get_dive_status",
  title: "Get Niche Dive Status",
  description:
    "Use this to poll a niche dive started with `create_niche_dive` until it finishes. " +
    "Returns one of three shapes keyed by `status`: `in_progress` (with `estimatedCompletionDate`), " +
    "`success` (with the new `nicheId` plus `tokensUsed`/`tokensLeft`), or `error` (with an `error` message). " +
    "On `success`, use the `nicheId` with `list_niches`, `get_niche_keywords`, `get_niche_competitors`, etc. " +
    "Re-poll periodically — dives can take minutes; the `estimatedCompletionDate` hints at when to check.",
  inputSchema,
  annotations: { readOnlyHint: true },
  handler: async (args, ctx) => {
    return await httpGet<DiveStatus>(
      { config: ctx.config, toolName: "get_dive_status" },
      `/v1/niches/dives/${encodeURIComponent(args.diveId)}`,
    );
  },
};
