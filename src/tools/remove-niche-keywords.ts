import { z } from "zod";
import { httpPost } from "../http/client.js";
import { NICHE_KEYWORDS_MAX_PER_CALL, type RemoveNicheKeywordsResult } from "../types/api.js";
import { nicheKeywordList } from "./niche-keyword-list.js";
import type { ToolDefinition } from "./types.js";

const inputSchema = {
  nicheId: z.string().min(1).describe("The niche whose Master Keyword List to remove from. Get one from `list_niches`."),
  keywords: nicheKeywordList.describe(
    `The keywords to take out, 1–${NICHE_KEYWORDS_MAX_PER_CALL} per call, at most 255 characters each. They ` +
      "are lower-cased and trimmed, and must be unique after that. Put every keyword in one call: this tool " +
      "allows only 2 calls per minute per niche.",
  ),
};

export const removeNicheKeywordsTool: ToolDefinition<typeof inputSchema> = {
  name: "remove_niche_keywords",
  title: "Remove Keywords from a Niche's Master Keyword List",
  description:
    "Use this to undo `add_niche_keywords`: take keywords back out of a niche's Master Keyword List (MKL). " +
    "Only keywords that were added to the MKL can be removed — `get_niche_keywords` shows each keyword's " +
    "`origin`. What happens depends on that origin, and the response reports it per keyword: " +
    "`removedManual` — added by hand (`manual`), deleted from the niche; `sentBackToOutliers` / " +
    "`sentBackToResidue` — moved in from those lists (`outlier` / `residue`), listed there again with their " +
    "data kept; `notRemovable` — found by the dive itself (`mkl`) or not in the niche, left unchanged. To hide " +
    "a keyword the dive found, use `add_keyword_exclusions` instead. Free, and safe to repeat: a keyword already " +
    "removed comes back under `notRemovable`. Adding a hand-added keyword back later re-dives the niche and " +
    "costs Dive tokens if the niche is stale by then. Limited to 2 calls per minute per niche.",
  inputSchema,
  // Deletes hand-added keywords, and putting them back can cost Dive tokens on a stale niche.
  annotations: { readOnlyHint: false, destructiveHint: true, openWorldHint: false },
  handler: async (args, ctx) => {
    return await httpPost<RemoveNicheKeywordsResult>(
      { config: ctx.config, toolName: "remove_niche_keywords" },
      `/v1/niches/${encodeURIComponent(args.nicheId)}/keywords/remove`,
      { keywords: args.keywords },
    );
  },
};
