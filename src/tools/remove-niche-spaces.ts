import { z } from "zod";
import { httpPost } from "../http/client.js";
import type { RemoveNicheTagsResult } from "../types/api.js";
import { NICHE_TAG_WRITE_RULES, nicheTagIdList } from "./niche-tag-ids.js";
import type { ToolDefinition } from "./types.js";

const inputSchema = {
  nicheId: z.string().min(1).describe("The niche to change. Get one from `list_niches`."),
  spaceIds: nicheTagIdList("spaceIds").describe(
    "The ids of the Spaces to take the niche out of, 1-100, unique. Get them from `list_spaces`.",
  ),
};

export const removeNicheSpacesTool: ToolDefinition<typeof inputSchema> = {
  name: "remove_niche_spaces",
  title: "Remove a Niche from Spaces",
  description:
    "Use this to take a niche out of one or more Spaces (ids from `list_spaces`). " +
    "A Space controls who can see the niche, so adding or removing one changes access. Returns `removed` and `notPresent`. Undo with `add_niche_spaces`. " +
    NICHE_TAG_WRITE_RULES,
  inputSchema,
  annotations: { readOnlyHint: false, destructiveHint: true, openWorldHint: false },
  handler: async (args, ctx) => {
    return await httpPost<RemoveNicheTagsResult>(
      { config: ctx.config, toolName: "remove_niche_spaces" },
      `/v1/niches/${encodeURIComponent(args.nicheId)}/spaces/remove`,
      { spaceIds: args.spaceIds },
    );
  },
};
