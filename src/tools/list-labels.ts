import { httpGet } from "../http/client.js";
import type { TagNode } from "../types/api.js";
import type { ToolDefinition } from "./types.js";

const inputSchema = {};

export const listLabelsTool: ToolDefinition<typeof inputSchema> = {
  name: "list_labels",
  title: "List Labels",
  description:
    "Use this first when the user talks about labels, or to find the `id`s that `add_niche_labels`, " +
    "`remove_niche_labels` and the `labels` filter of `list_niches` and `list_rank_radars` take. " +
    "Returns the labels as a tree: each node has `id`, `name`, `path` (names from the root joined with `/`), " +
    "`parentId` and `children`. Labels carry no access rights, so every label of the organization is listed. " +
    "Niches carry the ids of their labels in `spaces` / `labels` on `list_niches`.",
  inputSchema,
  annotations: { readOnlyHint: true },
  handler: async (_args, ctx): Promise<TagNode[]> => {
    return await httpGet<TagNode[]>({ config: ctx.config, toolName: "list_labels" }, "/v1/labels");
  },
};
