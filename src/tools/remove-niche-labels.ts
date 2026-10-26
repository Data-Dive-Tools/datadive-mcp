import { z } from "zod";
import { httpPost } from "../http/client.js";
import type { RemoveNicheTagsResult } from "../types/api.js";
import { NICHE_TAG_WRITE_RULES, nicheTagIdList } from "./niche-tag-ids.js";
import type { ToolDefinition } from "./types.js";

const inputSchema = {
  nicheId: z.string().min(1).describe("The niche to change. Get one from `list_niches`."),
  labelIds: nicheTagIdList("labelIds").describe(
    "The ids of the labels to take the niche out of, 1-100, unique. Get them from `list_labels`.",
  ),
};

export const removeNicheLabelsTool: ToolDefinition<typeof inputSchema> = {
  name: "remove_niche_labels",
  title: "Remove Labels from a Niche",
  description:
    "Use this to take a niche out of one or more labels (ids from `list_labels`). " +
    "Returns `removed` and `notPresent`. Undo with `add_niche_labels`. " +
    NICHE_TAG_WRITE_RULES,
  inputSchema,
  annotations: { readOnlyHint: false, destructiveHint: true, openWorldHint: false },
  handler: async (args, ctx) => {
    return await httpPost<RemoveNicheTagsResult>(
      { config: ctx.config, toolName: "remove_niche_labels" },
      `/v1/niches/${encodeURIComponent(args.nicheId)}/labels/remove`,
      { labelIds: args.labelIds },
    );
  },
};
