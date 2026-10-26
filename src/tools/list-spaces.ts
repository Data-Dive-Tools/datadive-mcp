import { httpGet } from "../http/client.js";
import type { TagNode } from "../types/api.js";
import type { ToolDefinition } from "./types.js";

const inputSchema = {};

export const listSpacesTool: ToolDefinition<typeof inputSchema> = {
  name: "list_spaces",
  title: "List Spaces",
  description:
    "Use this first when the user talks about Spaces, or to find the `id`s that `add_niche_spaces`, " +
    "`remove_niche_spaces` and the `spaces` filter of `list_niches` and `list_rank_radars` take. " +
    "Returns the Spaces as a tree: each node has `id`, `name`, `path` (names from the root joined with `/`), " +
    "`parentId` and `children`. An MCP user sees only the Spaces they have rights on, so a Space that is missing from the tree is one they cannot use. " +
    "Niches carry the ids of their Spaces in `spaces` / `labels` on `list_niches`.",
  inputSchema,
  annotations: { readOnlyHint: true },
  handler: async (_args, ctx): Promise<TagNode[]> => {
    return await httpGet<TagNode[]>({ config: ctx.config, toolName: "list_spaces" }, "/v1/spaces");
  },
};
