import { z } from "zod";
import { httpPost } from "../http/client.js";
import type { AddNicheTagsResult } from "../types/api.js";
import { NICHE_TAG_WRITE_RULES, nicheTagIdList } from "./niche-tag-ids.js";
import type { ToolDefinition } from "./types.js";

const inputSchema = {
  nicheId: z.string().min(1).describe("The niche to change. Get one from `list_niches`."),
  labelIds: nicheTagIdList("labelIds").describe(
    "The ids of the labels to add the niche to, 1-100, unique. Get them from `list_labels`.",
  ),
};

export const addNicheLabelsTool: ToolDefinition<typeof inputSchema> = {
  name: "add_niche_labels",
  title: "Add Labels to a Niche",
  description:
    "Use this to put a niche in one or more labels (ids from `list_labels`). " +
    "Returns `added` and `alreadyPresent`. Undo with `remove_niche_labels`. " +
    NICHE_TAG_WRITE_RULES,
  inputSchema,
  annotations: { readOnlyHint: false, destructiveHint: true, openWorldHint: false },
  handler: async (args, ctx) => {
    return await httpPost<AddNicheTagsResult>(
      { config: ctx.config, toolName: "add_niche_labels" },
      `/v1/niches/${encodeURIComponent(args.nicheId)}/labels`,
      { labelIds: args.labelIds },
    );
  },
};
