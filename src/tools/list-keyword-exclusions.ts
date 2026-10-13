import { z } from "zod";
import { httpGet } from "../http/client.js";
import type { KeywordExclusions } from "../types/api.js";
import type { ToolDefinition } from "./types.js";

const inputSchema = {
  nicheId: z.string().min(1).describe("The unique identifier of the Niche (from `list_niches`)."),
};

export const listKeywordExclusionsTool: ToolDefinition<typeof inputSchema> = {
  name: "list_keyword_exclusions",
  title: "List a Niche's Keyword Exclusions",
  description:
    "Use this to see which keywords are hidden from a niche's Master Keyword List, e.g. when a keyword the " +
    "user expects is missing from `get_niche_keywords`. Returns the same lists the DataDive web app shows, " +
    "oldest first: `exact` — each entry hides the one keyword that matches it exactly, with that keyword's " +
    "`searchVolume` (0 when the niche has no such keyword); `phrase` — each entry hides every keyword that " +
    "contains the phrase, with `excludedKeywordsCount` and the total `searchVolume` of the keywords it hides " +
    "(not counting ones already excluded exactly). Exclusions hide keywords wherever they come from: the " +
    "dive, the Outliers and Residue lists, and hand-added ones. Change them with `add_keyword_exclusions` " +
    "and `remove_keyword_exclusions`.",
  inputSchema,
  annotations: { readOnlyHint: true },
  handler: async (args, ctx) => {
    return await httpGet<KeywordExclusions>(
      { config: ctx.config, toolName: "list_keyword_exclusions" },
      `/v1/niches/${encodeURIComponent(args.nicheId)}/keyword-exclusions`,
    );
  },
};
