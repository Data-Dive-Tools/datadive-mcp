import { z } from "zod";
import { httpPost } from "../http/client.js";
import type { AddNicheTagsResult } from "../types/api.js";
import { NICHE_TAG_WRITE_RULES, nicheTagIdList } from "./niche-tag-ids.js";
import type { ToolDefinition } from "./types.js";

const inputSchema = {
  nicheId: z.string().min(1).describe("The niche to change. Get one from `list_niches`."),
  spaceIds: nicheTagIdList("spaceIds").describe(
    "The ids of the Spaces to add the niche to, 1-100, unique. Get them from `list_spaces`.",
  ),
};

export const addNicheSpacesTool: ToolDefinition<typeof inputSchema> = {
  name: "add_niche_spaces",
  title: "Add a Niche to Spaces",
  description:
    "Use this to put a niche in one or more Spaces (ids from `list_spaces`). " +
    "A Space controls who can see the niche, so adding or removing one changes access. Returns `added` and `alreadyPresent`. Undo with `remove_niche_spaces`. " +
    NICHE_TAG_WRITE_RULES,
  inputSchema,
  // Like every write tool here: clients prompt on destructiveHint. Changing a Space also changes who can see the niche.
  annotations: { readOnlyHint: false, destructiveHint: true, openWorldHint: false },
  handler: async (args, ctx) => {
    return await httpPost<AddNicheTagsResult>(
      { config: ctx.config, toolName: "add_niche_spaces" },
      `/v1/niches/${encodeURIComponent(args.nicheId)}/spaces`,
      { spaceIds: args.spaceIds },
    );
  },
};
